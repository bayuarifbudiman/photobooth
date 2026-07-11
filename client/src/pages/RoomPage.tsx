import { User, signOut } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../firebase';
import { frames, Frame, PixelSlot } from '../frames';
import { useWS } from '../context/WebSocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { CapturedPhoto } from '../types';
import CaptureControls from '../components/CaptureControls';
import CountdownOverlay from '../components/CountdownOverlay';
import PhotoStrip from '../components/PhotoStrip';
import VideoDisplay from '../components/VideoDisplay';

interface Props { user: User }

export default function RoomPage({ user }: Props) {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isHost = searchParams.get('role') === 'host';
  const frameId = searchParams.get('frame') || 'polaroid';

  const { send, subscribe } = useWS();
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerName, setPeerName] = useState('Friend');
  const [selectedFrame] = useState<Frame>(
    () => frames.find((f) => f.id === frameId) ?? frames[1]
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [copied, setCopied] = useState(false);
  const [stripInProgress, setStripInProgress] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedFrameRef = useRef(selectedFrame);
  selectedFrameRef.current = selectedFrame;
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const stripShotsRef = useRef<HTMLCanvasElement[]>([]);

  const { localStream, remoteStream, cameraError } = useWebRTC({
    isHost,
    peerConnected,
    send,
    subscribe,
  });

  remoteStreamRef.current = remoteStream;

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'peer-joined') {
        setPeerConnected(true);
        setPeerName(msg.peerName || 'Friend');
      } else if (msg.type === 'room-joined') {
        setPeerConnected(true);
        setPeerName(msg.peerName || 'Host');
      } else if (msg.type === 'peer-left') {
        setPeerConnected(false);
        setPeerName('Friend');
      } else if (msg.type === 'countdown') {
        startCountdownDisplay(msg.duration);
      } else if (msg.type === 'capture') {
        capturePhoto();
      }
    });
  }, [subscribe]);

  function startCountdownDisplay(duration: number) {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(duration);
    if (duration === 0) return;
    let remaining = duration;
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current!);
        countdownTimerRef.current = null;
      }
    }, 1000);
  }

  // ── Photo capture ──────────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const frame = selectedFrameRef.current;
    const isDuo = !!remoteStreamRef.current;

    const localVideo  = container.querySelector('video[data-role="local"]')  as HTMLVideoElement | undefined;
    const remoteVideo = container.querySelector('video[data-role="remote"]') as HTMLVideoElement | undefined;

    // Draw video into an area with cover-crop (no slot offset needed for scene canvas)
    function drawInArea(
      ctx: CanvasRenderingContext2D,
      video: HTMLVideoElement | undefined,
      dx: number, dy: number, dw: number, dh: number,
      mirror = false,
    ) {
      if (!video || video.readyState < 2) {
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(dx, dy, dw, dh); return;
      }
      const vw = video.videoWidth  || video.clientWidth;
      const vh = video.videoHeight || video.clientHeight;
      if (!vw || !vh) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(dx, dy, dw, dh); return; }

      const scale = Math.max(dw / vw, dh / vh);
      const sw = dw / scale, sh = dh / scale;
      const sx = (vw - sw) / 2, sy = (vh - sh) / 2;

      ctx.save();
      ctx.beginPath(); ctx.rect(dx, dy, dw, dh); ctx.clip();
      if (mirror) {
        ctx.translate(dx + dw, dy); ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
      } else {
        ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      }
      ctx.restore();
    }

    // Helper: slot-aware draw (used by single-frame path)
    function drawInSlot(
      ctx: CanvasRenderingContext2D,
      video: HTMLVideoElement | undefined,
      slot: PixelSlot,
      mirror = false,
    ) {
      drawInArea(ctx, video, slot.x, slot.y, slot.w, slot.h, mirror);
    }

    // ── Strip frame: capture one scene per call, compose after 3 ──────────────
    if (frame.frameType === 'strip') {
      const slot = frame.stripSlots[0]; // all slots are the same size
      const sc = document.createElement('canvas');
      sc.width = slot.w; sc.height = slot.h;
      const sCtx = sc.getContext('2d')!;
      sCtx.fillStyle = '#1a1a2e'; sCtx.fillRect(0, 0, slot.w, slot.h);

      if (isDuo) {
        drawInArea(sCtx, localVideo,  0,          0, slot.w / 2, slot.h, true);
        drawInArea(sCtx, remoteVideo, slot.w / 2, 0, slot.w / 2, slot.h, false);
      } else {
        drawInArea(sCtx, localVideo, 0, 0, slot.w, slot.h, true);
      }

      stripShotsRef.current.push(sc);
      const shotsDone = stripShotsRef.current.length;
      setTimeout(() => setCountdown(null), 500);

      if (shotsDone < 3) return; // wait for remaining shots

      // All 3 captured — compose the final strip
      const { canvasW: W, canvasH: H } = frame;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      frame.drawBackground(ctx, isDuo);

      frame.stripSlots.forEach((s, i) => {
        const shot = stripShotsRef.current[i];
        if (!shot) return;
        ctx.save();
        ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
        ctx.drawImage(shot, s.x, s.y, s.w, s.h);
        ctx.restore();
      });

      frame.drawForeground(ctx, isDuo);

      const dataUrl = canvas.toDataURL('image/png');
      stripShotsRef.current = [];
      setStripInProgress(false);
      setPhotos((prev) => [
        ...prev,
        { id: uuidv4(), dataUrl, frameId: frame.id, takenAt: Date.now() },
      ]);
      return;
    }

    // ── Single frame capture ──────────────────────────────────────────────────
    const { canvasW: W, canvasH: H } = frame;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    frame.drawBackground(ctx, isDuo);

    if (isDuo) {
      drawInSlot(ctx, localVideo,  frame.duoSlots[0], true);
      drawInSlot(ctx, remoteVideo, frame.duoSlots[1], false);
    } else {
      drawInSlot(ctx, localVideo, frame.soloSlot, true);
    }

    frame.drawForeground(ctx, isDuo);

    const dataUrl = canvas.toDataURL('image/png');
    setPhotos((prev) => [
      ...prev,
      { id: uuidv4(), dataUrl, frameId: frame.id, takenAt: Date.now() },
    ]);
    setTimeout(() => setCountdown(null), 500);
  }, []);

  const handleCaptureRequest = (delay: number) => {
    const frame = selectedFrameRef.current;

    // Strip: trigger 3 consecutive countdowns automatically
    if (frame.frameType === 'strip') {
      setStripInProgress(true);
      stripShotsRef.current = [];

      const shoot = () => {
        send({ type: 'start-countdown', duration: 3 });
        setTimeout(() => send({ type: 'capture' }), 3000);
      };

      shoot();                         // Shot 1 starts immediately
      setTimeout(shoot, 5000);         // Shot 2 at 5 s
      setTimeout(shoot, 10000);        // Shot 3 at 10 s
      return;
    }

    if (delay === 0) {
      send({ type: 'start-countdown', duration: 0 });
      send({ type: 'capture' });
    } else {
      send({ type: 'start-countdown', duration: delay });
      setTimeout(() => send({ type: 'capture' }), delay * 1000);
    }
  };

  const handleLeave = () => { send({ type: 'leave-room' }); navigate('/lobby'); };

  const copyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Camera error screen ───────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-center px-4">
        <div>
          <div className="text-5xl mb-4">📷</div>
          <h2 className="text-white text-xl font-bold mb-2">Camera access required</h2>
          <p className="text-gray-400 text-sm max-w-sm">{cameraError}</p>
          <button onClick={() => navigate('/lobby')} className="mt-6 rounded-xl bg-pink-600 px-6 py-3 text-white font-semibold hover:bg-pink-500 transition">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isStrip = selectedFrame.frameType === 'strip';
  const captureDisabled = countdown !== null || stripInProgress;

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col bg-[#0a0a0f] overflow-hidden">

      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-white/5">
        <span className="text-lg font-bold text-white">Photo<span className="text-pink-500">booth</span></span>
        <div className="flex-1" />
        <button onClick={copyCode} className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-1.5 hover:bg-white/10 transition group" title="Click to copy">
          <span className="text-xs text-gray-400">Room</span>
          <span className="font-mono text-sm font-bold text-white tracking-widest">{roomId}</span>
          <span className="text-xs text-gray-500 group-hover:text-pink-400 transition">{copied ? '✓ Copied!' : '📋'}</span>
        </button>
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${peerConnected ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${peerConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          {peerConnected ? `With ${peerName}` : 'Waiting for friend'}
        </div>
        {user.photoURL && <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full border border-white/10" />}
        <button onClick={handleLeave} className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition">Leave</button>
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Video area */}
        <div className="relative flex flex-1 min-h-0 items-center justify-center p-4 overflow-hidden">
          <div
            ref={videoContainerRef}
            className="relative overflow-hidden rounded-2xl shadow-2xl"
            style={{
              aspectRatio: `${selectedFrame.canvasW} / ${selectedFrame.canvasH}`,
              height: '100%',
              maxWidth: '100%',
            }}
          >
            <VideoDisplay
              localStream={localStream}
              remoteStream={remoteStream}
              localName={user.displayName || 'You'}
              remoteName={peerName}
              frame={selectedFrame}
            />
            <CountdownOverlay count={countdown} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="shrink-0 flex w-64 flex-col gap-4 border-l border-white/5 p-4 overflow-y-auto">

          {/* Invite / peer status */}
          {!peerConnected ? (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Invite a friend</p>
                <p className="text-xs text-gray-400 mt-0.5">Share this code to snap together</p>
              </div>
              <div className="font-mono text-3xl font-black text-pink-400 tracking-widest text-center py-1">
                {roomId}
              </div>
              <button
                onClick={copyCode}
                className="w-full rounded-lg bg-pink-600/80 py-2 text-sm text-white font-medium hover:bg-pink-600 transition"
              >
                {copied ? '✓ Copied!' : '📋 Copy Code'}
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{peerName}</p>
                <p className="text-xs text-gray-400">Connected</p>
              </div>
            </div>
          )}

          {/* Strip mode indicator */}
          {isStrip && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-xs font-semibold text-amber-400">🎬 Strip 3×1 mode</p>
              <p className="text-xs text-gray-400 mt-1">
                {stripInProgress
                  ? `Taking ${3 - stripShotsRef.current.length} more shot${3 - stripShotsRef.current.length !== 1 ? 's' : ''}…`
                  : 'Press capture to take 3 photos automatically.'}
              </p>
            </div>
          )}

          {/* Capture controls */}
          <div className="border-t border-white/5 pt-4">
            <CaptureControls
              onCapture={handleCaptureRequest}
              disabled={captureDisabled}
              peerConnected={peerConnected}
            />
          </div>

          {/* Sign out */}
          <div className="mt-auto pt-2 border-t border-white/5">
            <button onClick={() => { handleLeave(); signOut(auth); }} className="w-full text-left text-xs text-gray-600 hover:text-gray-400 transition px-1 py-2">
              Sign out
            </button>
          </div>
        </aside>
      </div>

      {/* Photo strip */}
      <div className="shrink-0 h-36 border-t border-white/5 bg-black/30 px-4">
        <PhotoStrip photos={photos} onDelete={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))} />
      </div>
    </div>
  );
}

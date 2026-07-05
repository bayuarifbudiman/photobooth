import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../firebase';
import { frames, Frame } from '../frames';
import { useWS } from '../context/WebSocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { CapturedPhoto } from '../types';
import CaptureControls from '../components/CaptureControls';
import CountdownOverlay from '../components/CountdownOverlay';
import FrameSelector from '../components/FrameSelector';
import PhotoStrip from '../components/PhotoStrip';
import VideoDisplay from '../components/VideoDisplay';

interface Props {
  user: User;
}

export default function RoomPage({ user }: Props) {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role') as 'host' | 'guest';
  const isHost = role === 'host';

  const { send, subscribe } = useWS();
  const [peerConnected, setPeerConnected] = useState(false);
  const [peerName, setPeerName] = useState('Friend');
  const [selectedFrame, setSelectedFrame] = useState<Frame>(frames[1]); // start with Polaroid
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [copied, setCopied] = useState(false);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedFrameRef = useRef(selectedFrame);
  selectedFrameRef.current = selectedFrame;

  const { localStream, remoteStream, cameraError } = useWebRTC({
    isHost,
    peerConnected,
    send,
    subscribe,
  });

  // Keep video elements in sync with streams
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Room signaling messages
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
    if (duration === 0) {
      // Immediate capture signal will arrive shortly from server
      return;
    }
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

  const capturePhoto = useCallback(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const videos = container.querySelectorAll('video');
    const localVideo = videos[0] as HTMLVideoElement | undefined;
    const remoteVideo = videos[1] as HTMLVideoElement | undefined;
    const isSolo = !remoteVideo;

    // Solo: square 800×800; paired: wide 1200×600
    const W = isSolo ? 800 : 1200;
    const H = isSolo ? 800 : 600;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    function drawVideoFit(
      video: HTMLVideoElement | undefined,
      dx: number, dy: number, dw: number, dh: number
    ) {
      if (!video || video.readyState < 2) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(dx, dy, dw, dh);
        ctx.fillStyle = '#2d2d4a';
        ctx.beginPath();
        ctx.arc(dx + dw / 2, dy + dh * 0.4, dh * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(dx + dw / 2, dy + dh * 0.75, dh * 0.25, dh * 0.3, 0, Math.PI, 0);
        ctx.fill();
        return;
      }
      const vw = video.videoWidth || video.clientWidth;
      const vh = video.videoHeight || video.clientHeight;
      if (!vw || !vh) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(dx, dy, dw, dh); return; }

      const scale = Math.max(dw / vw, dh / vh);
      const sw = dw / scale;
      const sh = dh / scale;
      const sx = (vw - sw) / 2;
      const sy = (vh - sh) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, dw, dh);
      ctx.clip();
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    }

    if (isSolo) {
      // Full-width mirrored local video
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      drawVideoFit(localVideo, 0, 0, W, H);
      ctx.restore();
    } else {
      // Local (left, mirrored) + remote (right)
      ctx.save();
      ctx.translate(W / 2, 0);
      ctx.scale(-1, 1);
      drawVideoFit(localVideo, 0, 0, W / 2, H);
      ctx.restore();
      drawVideoFit(remoteVideo, W / 2, 0, W / 2, H);
    }

    // Frame overlay
    selectedFrameRef.current.drawOverlay(ctx, W, H);

    const dataUrl = canvas.toDataURL('image/png');
    setPhotos((prev) => [
      ...prev,
      {
        id: uuidv4(),
        dataUrl,
        frameId: selectedFrameRef.current.id,
        takenAt: Date.now(),
      },
    ]);

    // Flash effect: briefly reset countdown to null after capture
    setTimeout(() => setCountdown(null), 600);
  }, []);

  const handleCaptureRequest = (delay: number) => {
    if (delay === 0) {
      send({ type: 'start-countdown', duration: 0 });
      send({ type: 'capture' });
    } else {
      send({ type: 'start-countdown', duration: delay });
      // Server will relay countdown; after `delay` seconds, send capture
      setTimeout(() => {
        send({ type: 'capture' });
      }, delay * 1000);
    }
  };

  const handleLeave = () => {
    send({ type: 'leave-room' });
    navigate('/lobby');
  };

  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (cameraError) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-center px-4">
        <div>
          <div className="text-5xl mb-4">📷</div>
          <h2 className="text-white text-xl font-bold mb-2">Camera access required</h2>
          <p className="text-gray-400 text-sm max-w-sm">{cameraError}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="mt-6 rounded-xl bg-pink-600 px-6 py-3 text-white font-semibold hover:bg-pink-500 transition"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-white/5 shrink-0">
        <span className="text-lg font-bold text-white">
          Photo<span className="text-pink-500">booth</span>
        </span>

        <div className="flex-1" />

        {/* Room code */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-1.5 hover:bg-white/10 transition group"
          title="Click to copy code"
        >
          <span className="text-xs text-gray-400">Room</span>
          <span className="font-mono text-sm font-bold text-white tracking-widest">
            {roomId}
          </span>
          <span className="text-xs text-gray-500 group-hover:text-pink-400 transition">
            {copied ? '✓ Copied!' : '📋'}
          </span>
        </button>

        {/* Connection badge */}
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
          peerConnected
            ? 'bg-green-500/15 text-green-400'
            : 'bg-yellow-500/15 text-yellow-400'
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${peerConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          {peerConnected ? `With ${peerName}` : 'Waiting for friend'}
        </div>

        {/* User avatar */}
        {user.photoURL && (
          <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full border border-white/10" />
        )}

        <button
          onClick={handleLeave}
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition"
        >
          Leave
        </button>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="relative flex-1 p-4">
          <div className="relative h-full rounded-2xl overflow-hidden bg-gray-900 shadow-2xl">
            <VideoDisplay
              localStream={localStream}
              remoteStream={remoteStream}
              localName={user.displayName || 'You'}
              remoteName={peerName}
              frame={selectedFrame}
              containerRef={videoContainerRef}
            />
            <CountdownOverlay count={countdown} />
          </div>

          {/* Share hint when no peer */}
          {!peerConnected && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-2xl bg-black/70 backdrop-blur-sm border border-white/10 px-6 py-4 text-center">
              <p className="text-white font-semibold">Invite a friend!</p>
              <p className="text-gray-400 text-sm mt-1">
                Share room code <span className="font-mono font-bold text-pink-400">{roomId}</span>
              </p>
              <button
                onClick={copyCode}
                className="mt-3 rounded-lg bg-pink-600/80 px-5 py-2 text-sm text-white font-medium hover:bg-pink-600 transition"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col gap-5 border-l border-white/5 p-4 overflow-y-auto">
          <FrameSelector
            selectedId={selectedFrame.id}
            onSelect={setSelectedFrame}
          />

          <div className="border-t border-white/5 pt-4">
            <CaptureControls
              onCapture={handleCaptureRequest}
              disabled={countdown !== null}
              peerConnected={peerConnected}
            />
          </div>

          {/* Sign out */}
          <div className="mt-auto pt-2 border-t border-white/5">
            <button
              onClick={() => { handleLeave(); signOut(auth); }}
              className="w-full text-left text-xs text-gray-600 hover:text-gray-400 transition px-1 py-2"
            >
              Sign out
            </button>
          </div>
        </aside>
      </div>

      {/* Photo strip */}
      <div className="shrink-0 h-36 border-t border-white/5 bg-black/30 px-4">
        <PhotoStrip
          photos={photos}
          onDelete={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
        />
      </div>
    </div>
  );
}

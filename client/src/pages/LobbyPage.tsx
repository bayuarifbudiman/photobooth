import { signOut } from 'firebase/auth';
import { User } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useWS } from '../context/WebSocketContext';
import { frames, Frame } from '../frames';
import VideoDisplay from '../components/VideoDisplay';

interface Props { user: User }

// ── Frame thumbnail rendered via canvas ───────────────────────────────────────
function FrameThumbnail({
  frame, selected, onClick,
}: { frame: Frame; selected: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, frame.canvasW, frame.canvasH);
    frame.drawBackground(ctx, false);

    const drawSilhouette = (s: { x: number; y: number; w: number; h: number }) => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#2d2d4e';
      ctx.beginPath();
      ctx.arc(s.x + s.w / 2, s.y + s.h * 0.38, s.h * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s.x + s.w / 2, s.y + s.h * 0.75, s.w * 0.22, s.h * 0.28, 0, Math.PI, 0);
      ctx.fill();
    };

    if (frame.frameType === 'single') {
      drawSilhouette(frame.soloSlot);
    } else {
      frame.stripSlots.forEach(drawSilhouette);
    }

    frame.drawForeground(ctx, false);
  }, [frame]);

  return (
    <button
      onClick={onClick}
      className={`overflow-hidden rounded-xl border-2 transition-all ${
        selected
          ? 'border-pink-500 scale-[1.03] shadow-lg shadow-pink-500/20'
          : 'border-white/10 hover:border-white/30'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={frame.canvasW}
        height={frame.canvasH}
        className="w-full h-auto block"
      />
      <div className={`py-1.5 text-xs font-medium text-center ${selected ? 'text-pink-400 bg-pink-500/10' : 'text-gray-400 bg-white/5'}`}>
        {frame.emoji} {frame.name}
      </div>
    </button>
  );
}

// ── Frame selection screen ─────────────────────────────────────────────────────
function FrameSelectionScreen({
  localStream, selectedFrame, onSelectFrame, onConfirm, onBack,
}: {
  localStream: MediaStream | null;
  selectedFrame: Frame;
  onSelectFrame: (f: Frame) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex h-screen flex-col bg-[#0a0a0f] overflow-hidden">
      <header className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-white/5">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition text-sm flex items-center gap-1">
          ← Back
        </button>
        <span className="text-lg font-bold text-white">
          Photo<span className="text-pink-500">booth</span>
        </span>
        <span className="text-gray-500 text-sm">— Choose your frame</span>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Live preview */}
        <div className="flex flex-1 min-h-0 items-center justify-center p-6 overflow-hidden">
          <div
            className="relative overflow-hidden rounded-2xl shadow-2xl"
            style={{
              aspectRatio: `${selectedFrame.canvasW} / ${selectedFrame.canvasH}`,
              height: '100%',
              maxWidth: '100%',
            }}
          >
            <VideoDisplay
              localStream={localStream}
              remoteStream={null}
              localName=""
              remoteName=""
              frame={selectedFrame}
            />
          </div>
        </div>

        {/* Frame picker + confirm */}
        <aside className="shrink-0 w-72 border-l border-white/5 flex flex-col p-4 gap-4 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Pick a frame</p>

          <div className="grid grid-cols-2 gap-3">
            {frames.map((frame) => (
              <FrameThumbnail
                key={frame.id}
                frame={frame}
                selected={selectedFrame.id === frame.id}
                onClick={() => onSelectFrame(frame)}
              />
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-white/5">
            <button
              onClick={onConfirm}
              className="w-full rounded-xl bg-pink-600 py-3 font-semibold text-white hover:bg-pink-500 transition active:scale-95"
            >
              Enter Room →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Main lobby ─────────────────────────────────────────────────────────────────
export default function LobbyPage({ user }: Props) {
  const navigate = useNavigate();
  const { connected, send, subscribe } = useWS();
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  const [step, setStep] = useState<'lobby' | 'select-frame'>('lobby');
  const [pendingRoom, setPendingRoom] = useState<{ roomId: string; role: 'host' | 'guest' } | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<Frame>(frames[1]); // Polaroid default
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);

  // Camera for frame preview
  useEffect(() => {
    if (step !== 'select-frame') return;
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
      .then((stream) => { if (active) setLocalStream(stream); })
      .catch(() => { /* camera optional in preview */ });
    return () => {
      active = false;
      setLocalStream((prev) => { prev?.getTracks().forEach((t) => t.stop()); return null; });
    };
  }, [step]);

  // WebSocket messages
  useEffect(() => {
    return subscribeRef.current((msg) => {
      if (msg.type === 'room-created') {
        setPendingRoom({ roomId: msg.roomId, role: 'host' });
        setStep('select-frame');
        setLoading(null);
      } else if (msg.type === 'room-joined') {
        setPendingRoom({ roomId: msg.roomId, role: 'guest' });
        setStep('select-frame');
        setLoading(null);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setLoading(null);
      }
    });
  }, []);

  const handleCreate = () => {
    setError('');
    setLoading('create');
    send({ type: 'create-room', displayName: user.displayName || 'Host', photoURL: user.photoURL || '' });
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('Enter a room code.'); return; }
    setError('');
    setLoading('join');
    send({ type: 'join-room', roomId: code, displayName: user.displayName || 'Guest', photoURL: user.photoURL || '' });
  };

  const handleEnterRoom = () => {
    if (!pendingRoom) return;
    navigate(`/room/${pendingRoom.roomId}?role=${pendingRoom.role}&frame=${selectedFrame.id}`);
  };

  const handleBack = () => {
    setStep('lobby');
    setLoading(null);
    setError('');
  };

  // ── Frame selection screen ──────────────────────────────────────────────────
  if (step === 'select-frame' && pendingRoom) {
    return (
      <FrameSelectionScreen
        localStream={localStream}
        selectedFrame={selectedFrame}
        onSelectFrame={setSelectedFrame}
        onConfirm={handleEnterRoom}
        onBack={handleBack}
      />
    );
  }

  // ── Lobby ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4">
      <div
        className="pointer-events-none fixed left-1/3 top-1/3 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: '#ff00aa' }}
      />

      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <span className="text-2xl font-bold text-white">
          Photo<span className="text-pink-500">booth</span>
        </span>
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <img src={user.photoURL} alt="" className="h-9 w-9 rounded-full border-2 border-pink-500/50" />
          )}
          <span className="text-sm text-gray-400 hidden sm:block">{user.displayName}</span>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-gray-500 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        <div className="text-center mb-2">
          <h2 className="text-3xl font-bold text-white">Ready to snap?</h2>
          <p className="text-gray-400 mt-1">Create a room or join a friend's.</p>
          {!connected && (
            <p className="text-yellow-500 text-sm mt-2 animate-pulse">Connecting to server…</p>
          )}
        </div>

        {/* Create room */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-3">
          <h3 className="font-semibold text-white text-lg">Start a new session</h3>
          <p className="text-gray-400 text-sm">You'll pick a frame, then get a code to share.</p>
          <button
            onClick={handleCreate}
            disabled={!connected || loading !== null}
            className="mt-2 rounded-xl bg-pink-600 px-6 py-3 font-semibold text-white transition hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'create' && (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            Create Room
          </button>
        </div>

        {/* Join room */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col gap-3">
          <h3 className="font-semibold text-white text-lg">Join a friend's room</h3>
          <input
            type="text"
            placeholder="Enter room code (e.g. AB12CD)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            maxLength={6}
            className="rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-pink-500 transition font-mono text-lg tracking-widest"
          />
          <button
            onClick={handleJoin}
            disabled={!connected || loading !== null}
            className="rounded-xl border border-pink-500/50 bg-transparent px-6 py-3 font-semibold text-pink-400 transition hover:bg-pink-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'join' && (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
            )}
            Join Room
          </button>
        </div>

        {error && (
          <p className="text-center text-red-400 text-sm rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

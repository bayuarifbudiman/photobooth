import { signOut } from 'firebase/auth';
import { User } from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useWS } from '../context/WebSocketContext';

interface Props {
  user: User;
}

export default function LobbyPage({ user }: Props) {
  const navigate = useNavigate();
  const { connected, send, subscribe } = useWS();
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  // Keep subscribe ref stable
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  useEffect(() => {
    return subscribeRef.current((msg) => {
      if (msg.type === 'room-created') {
        navigate(`/room/${msg.roomId}?role=host`);
      } else if (msg.type === 'room-joined') {
        navigate(`/room/${msg.roomId}?role=guest`);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setLoading(null);
      }
    });
  }, [navigate]);

  const handleCreate = () => {
    setError('');
    setLoading('create');
    send({
      type: 'create-room',
      displayName: user.displayName || 'Host',
      photoURL: user.photoURL || '',
    });
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError('Enter a room code.'); return; }
    setError('');
    setLoading('join');
    send({
      type: 'join-room',
      roomId: code,
      displayName: user.displayName || 'Guest',
      photoURL: user.photoURL || '',
    });
  };

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
            <img
              src={user.photoURL}
              alt=""
              className="h-9 w-9 rounded-full border-2 border-pink-500/50"
            />
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
          <p className="text-gray-400 text-sm">You'll get a 6-character code to share with a friend.</p>
          <button
            onClick={handleCreate}
            disabled={!connected || loading !== null}
            className="mt-2 rounded-xl bg-pink-600 px-6 py-3 font-semibold text-white transition hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'create' ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
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
            {loading === 'join' ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
            ) : null}
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

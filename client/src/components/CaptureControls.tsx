import { useState } from 'react';

interface Props {
  onCapture: (delay: number) => void;
  disabled: boolean;
  peerConnected: boolean;
}

const DELAYS = [0, 3, 5, 10] as const;

export default function CaptureControls({ onCapture, disabled, peerConnected }: Props) {
  const [delay, setDelay] = useState<number>(3);

  return (
    <div className="flex flex-col gap-4">
      {!peerConnected && (
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center">
          <p className="text-gray-400 text-xs">Solo mode — invite a friend to snap together</p>
        </div>
      )}

      {/* Timer selector */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Timer</p>
        <div className="grid grid-cols-4 gap-1.5">
          {DELAYS.map((d) => (
            <button
              key={d}
              onClick={() => setDelay(d)}
              className={`rounded-lg border py-2 text-sm font-semibold transition ${
                delay === d
                  ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30 hover:text-white'
              }`}
            >
              {d === 0 ? 'Now' : `${d}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Capture button */}
      <button
        onClick={() => onCapture(delay)}
        disabled={disabled}
        className="group relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/30 bg-white/10 transition hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      >
        <div className="h-14 w-14 rounded-full bg-white transition group-hover:bg-pink-100 group-active:bg-pink-200" />
        {/* Shutter ring animation on hover */}
        <div className="absolute inset-0 rounded-full border-4 border-pink-500/0 transition group-hover:border-pink-500/40" />
      </button>
      <p className="text-center text-xs text-gray-600">Click to capture</p>
    </div>
  );
}

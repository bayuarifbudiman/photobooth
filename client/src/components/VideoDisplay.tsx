import { useEffect, useRef } from 'react';
import { Frame, slotStyle } from '../frames';

function BgCanvas({ frame, isDuo }: { frame: Frame; isDuo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, frame.canvasW, frame.canvasH);
    frame.drawBackground(ctx, isDuo);
  }, [frame, isDuo]);
  return (
    <canvas
      ref={ref}
      width={frame.canvasW}
      height={frame.canvasH}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0 }}
    />
  );
}

function FgCanvas({ frame, isDuo }: { frame: Frame; isDuo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, frame.canvasW, frame.canvasH);
    frame.drawForeground(ctx, isDuo);
  }, [frame, isDuo]);
  return (
    <canvas
      ref={ref}
      width={frame.canvasW}
      height={frame.canvasH}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 2 }}
    />
  );
}

interface VideoTileProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  label?: string;
  role?: 'local' | 'remote';
}

function VideoTile({ stream, muted = false, mirror = false, label, role }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative h-full w-full bg-gray-900">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          data-role={role}
          className={`h-full w-full object-cover${mirror ? ' video-mirror' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-600">
          <div className="text-center">
            <div className="text-4xl mb-2">👤</div>
            <p className="text-xs">Waiting…</p>
          </div>
        </div>
      )}
      {label && stream && (
        <div className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
          {label}
        </div>
      )}
    </div>
  );
}

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localName: string;
  remoteName: string;
  frame: Frame;
}

export default function VideoDisplay({
  localStream, remoteStream, localName, remoteName, frame,
}: Props) {
  const isDuo = !!remoteStream;

  // ── Strip frame: 3 identical scene tiles stacked vertically ─────────────────
  if (frame.frameType === 'strip') {
    return (
      <div
        className="relative w-full overflow-hidden"
        style={{ background: frame.bgColor, aspectRatio: `${frame.canvasW} / ${frame.canvasH}` }}
      >
        <BgCanvas frame={frame} isDuo={isDuo} />

        {frame.stripSlots.map((slot, i) => (
          <div key={i} style={{ ...slotStyle(slot, frame.canvasW, frame.canvasH), zIndex: 1 }}>
            {isDuo ? (
              <div className="relative h-full w-full">
                <div className="absolute inset-y-0 left-0 right-1/2">
                  {/* Only attach data-role to the FIRST set so querySelector finds one element */}
                  <VideoTile stream={localStream} muted mirror role={i === 0 ? 'local' : undefined} />
                </div>
                <div className="absolute inset-y-0 left-1/2 right-0">
                  <VideoTile stream={remoteStream} role={i === 0 ? 'remote' : undefined} />
                </div>
              </div>
            ) : (
              <VideoTile stream={localStream} muted mirror role={i === 0 ? 'local' : undefined} />
            )}
          </div>
        ))}

        <FgCanvas frame={frame} isDuo={isDuo} />
      </div>
    );
  }

  // ── Single frame ─────────────────────────────────────────────────────────────
  const localSlot = isDuo ? frame.duoSlots[0] : frame.soloSlot;
  const remoteSlot = frame.duoSlots[1];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: frame.bgColor, aspectRatio: `${frame.canvasW} / ${frame.canvasH}` }}
    >
      <BgCanvas frame={frame} isDuo={isDuo} />

      <div style={{ ...slotStyle(localSlot, frame.canvasW, frame.canvasH), zIndex: 1 }}>
        <VideoTile stream={localStream} muted mirror label={isDuo ? localName : undefined} role="local" />
      </div>

      {isDuo && (
        <div style={{ ...slotStyle(remoteSlot, frame.canvasW, frame.canvasH), zIndex: 1 }}>
          <VideoTile stream={remoteStream} label={remoteName} role="remote" />
        </div>
      )}

      <FgCanvas frame={frame} isDuo={isDuo} />
    </div>
  );
}

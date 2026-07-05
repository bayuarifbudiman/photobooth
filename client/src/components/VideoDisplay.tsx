import { useEffect, useRef } from 'react';
import { Frame } from '../frames';

interface VideoProps {
  stream: MediaStream | null;
  muted?: boolean;
  label?: string;
  mirror?: boolean;
}

function VideoTile({ stream, muted = false, label, mirror = false }: VideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gray-900">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`h-full w-full object-cover ${mirror ? 'video-mirror' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-900/80">
          <div className="text-center text-gray-600">
            <div className="text-5xl mb-3">👤</div>
            <p className="text-sm">Waiting for friend…</p>
          </div>
        </div>
      )}
      {label && stream && (
        <div className="absolute bottom-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
          {label}
        </div>
      )}
    </div>
  );
}

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localName: string;
  remoteName: string;
  frame: Frame;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function VideoDisplay({
  localStream,
  remoteStream,
  localName,
  remoteName,
  frame,
  containerRef,
}: VideoDisplayProps) {
  const isSolo = !remoteStream;

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl">
      <div className="flex h-full">
        {/* Local video — full width solo, left half when paired */}
        <div className={`relative h-full border-r border-black/30 transition-all duration-500 ${isSolo ? 'w-full' : 'w-1/2'}`}>
          <VideoTile stream={localStream} muted mirror label={isSolo ? undefined : localName} />
        </div>

        {/* Remote video — only shown when paired */}
        {!isSolo && (
          <div className="relative h-full w-1/2">
            <VideoTile stream={remoteStream} label={remoteName} />
          </div>
        )}
      </div>

      {/* Frame overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={frame.previewStyle}
      />

      {/* Center divider — only in paired mode */}
      {!isSolo && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-px bg-black/50" />
      )}
    </div>
  );
}

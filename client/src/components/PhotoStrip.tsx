import { CapturedPhoto } from '../types';

interface Props {
  photos: CapturedPhoto[];
  onDelete: (id: string) => void;
}

export default function PhotoStrip({ photos, onDelete }: Props) {
  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-700 text-sm">
        Captured photos will appear here
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 h-full items-center px-1">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative flex-shrink-0">
          <img
            src={photo.dataUrl}
            alt="Captured"
            className="h-28 rounded-lg object-cover shadow-lg border border-white/10"
          />
          {/* Actions on hover */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/60 opacity-0 transition group-hover:opacity-100">
            <a
              href={photo.dataUrl}
              download={`photobooth-${photo.takenAt}.png`}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition text-sm"
              title="Download"
            >
              ⬇️
            </a>
            <button
              onClick={() => onDelete(photo.id)}
              className="rounded-full bg-white/20 p-2 text-white hover:bg-red-500/60 transition text-sm"
              title="Delete"
            >
              🗑️
            </button>
          </div>
          {/* Timestamp */}
          <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[9px] text-gray-300">
            {new Date(photo.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ))}
    </div>
  );
}

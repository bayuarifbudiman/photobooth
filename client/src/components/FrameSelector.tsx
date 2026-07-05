import { frames, Frame } from '../frames';

interface Props {
  selectedId: string;
  onSelect: (frame: Frame) => void;
}

export default function FrameSelector({ selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Frame</p>
      <div className="grid grid-cols-3 gap-2">
        {frames.map((frame) => (
          <button
            key={frame.id}
            onClick={() => onSelect(frame)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 transition text-center ${
              selectedId === frame.id
                ? 'border-pink-500 bg-pink-500/15 text-white'
                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="text-2xl leading-none">{frame.emoji}</span>
            <span className="text-xs font-medium">{frame.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

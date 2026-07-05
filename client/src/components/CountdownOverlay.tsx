interface Props {
  count: number | null;
}

export default function CountdownOverlay({ count }: Props) {
  if (count === null) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      {count === 0 ? (
        <div className="countdown-pulse text-white text-9xl font-black drop-shadow-2xl">
          📸
        </div>
      ) : (
        <div
          key={count}
          className="countdown-pulse text-white font-black drop-shadow-2xl"
          style={{ fontSize: 'clamp(80px, 15vw, 160px)' }}
        >
          {count}
        </div>
      )}
    </div>
  );
}

// Placeholder while content loads. Hidden from screen readers, which get the status text.
export function Skeleton({ lines = 4, label }: { lines?: number; label?: string }) {
  return (
    <div role="status">
      {label && <span className="sr-only">{label}</span>}
      <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="h-6 rounded bg-tint" style={{ width: `${100 - (index % 3) * 15}%` }} />
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 animate-pulse">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted" />
          <div className="h-5 w-20 rounded bg-muted" />
        </div>
        <div className="flex gap-1">
          <div className="h-8 w-24 rounded-md bg-muted" />
          <div className="h-8 w-24 rounded-md bg-muted" />
        </div>
      </div>
      <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded-md bg-muted" />
            <div className="h-8 w-28 rounded-md bg-muted" />
          </div>
        </div>
        {/* Calendar grid skeleton */}
        <div className="p-4 flex-1">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-6 rounded bg-muted/60" />
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-16 md:h-20 rounded-md bg-muted" style={{ opacity: 0.3 + (i % 7) * 0.1 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

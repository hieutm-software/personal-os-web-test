// Skeleton displayed by <Suspense> while TasksData streams in.
// Mirrors the visual structure of the real TasksClient table.

export function TasksSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-2 px-2">
        <div className="w-6 h-6 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
      </div>

      {/* Card shell */}
      <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3">
          {/* Tab switcher placeholder */}
          <div className="flex gap-1">
            {[72, 56, 88, 96].map((w, i) => (
              <div key={i} className="h-7 rounded-md bg-muted" style={{ width: w }} />
            ))}
          </div>
          {/* Action buttons */}
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-md bg-muted" />
            <div className="h-8 w-28 rounded-md bg-muted" />
          </div>
        </div>

        {/* Table header */}
        <div className="flex px-4 py-2 border-b border-border gap-4">
          <div className="h-3 flex-1 rounded bg-muted/60" />
          <div className="h-3 w-32 rounded bg-muted/60 hidden md:block" />
          <div className="h-3 w-28 rounded bg-muted/60" />
          <div className="h-3 w-20 rounded bg-muted/60" />
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center px-4 py-3 gap-4 border-b border-border/50"
            style={{ opacity: 1 - i * 0.1 }}
          >
            <div className="h-3 flex-1 rounded bg-muted" style={{ width: `${60 + Math.sin(i) * 25}%` }} />
            <div className="h-3 w-24 rounded bg-muted hidden md:block" />
            <div className="h-5 w-24 rounded-full bg-muted" />
            <div className="h-5 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

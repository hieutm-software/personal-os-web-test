export function VaultSkeleton() {
  return (
    <div className="flex flex-col h-full gap-4 animate-pulse">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted" />
          <div className="h-5 w-12 rounded bg-muted" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-muted" />
      </div>
      <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3">
          <div className="h-7 w-48 rounded-md bg-muted" />
          <div className="flex gap-2">
            <div className="h-8 w-24 rounded-md bg-muted" />
            <div className="h-8 w-16 rounded-md bg-muted" />
            <div className="h-8 w-32 rounded-md bg-muted" />
          </div>
        </div>
        <div className="flex px-4 py-2 border-b border-border gap-4">
          <div className="h-3 flex-1 rounded bg-muted/60" />
          <div className="h-3 w-40 rounded bg-muted/60 hidden sm:block" />
          <div className="h-3 w-40 rounded bg-muted/60 hidden md:block" />
          <div className="h-3 w-32 rounded bg-muted/60 hidden sm:block" />
          <div className="h-3 w-20 rounded bg-muted/60" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center px-4 py-3 gap-4 border-b border-border/50" style={{ opacity: 1 - i * 0.1 }}>
            <div className="h-3 flex-1 rounded bg-muted" />
            <div className="h-3 w-36 rounded bg-muted hidden sm:block" />
            <div className="h-3 w-24 rounded-full bg-muted/60 hidden md:block" />
            <div className="h-3 w-24 rounded bg-muted hidden sm:block" />
            <div className="h-5 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="h-4 w-16 bg-surface-muted rounded mx-auto mb-2" />
        <div className="h-10 w-48 bg-surface-muted rounded mx-auto" />
      </div>
      <div className="h-10 w-full max-w-xl bg-surface-muted rounded-lg mx-auto mb-10" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl border border-border overflow-hidden animate-pulse">
            <div className="h-48 bg-surface-muted" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-24 bg-surface-muted rounded" />
              <div className="h-5 w-full bg-surface-muted rounded" />
              <div className="h-4 w-3/4 bg-surface-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

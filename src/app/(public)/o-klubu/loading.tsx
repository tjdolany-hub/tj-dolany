export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="h-4 w-16 bg-surface-muted rounded mx-auto mb-2" />
        <div className="h-10 w-40 bg-surface-muted rounded mx-auto" />
      </div>
      <div className="h-12 w-full max-w-2xl bg-surface-muted rounded-lg mx-auto mb-12" />
      <div className="space-y-8 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl border border-border p-6">
            <div className="h-6 w-48 bg-surface-muted rounded mb-4" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-surface-muted rounded" />
              <div className="h-4 w-5/6 bg-surface-muted rounded" />
              <div className="h-4 w-4/5 bg-surface-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

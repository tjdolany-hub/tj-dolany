export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="h-4 w-32 bg-surface-muted rounded mx-auto mb-2" />
        <div className="h-10 w-72 bg-surface-muted rounded mx-auto" />
      </div>
      <div className="h-12 w-full max-w-sm bg-surface-muted rounded-lg mx-auto mb-12" />
      <div className="bg-surface rounded-xl border border-border p-6 animate-pulse">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

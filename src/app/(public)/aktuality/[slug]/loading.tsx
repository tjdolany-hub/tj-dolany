export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse">
      <div className="h-4 w-32 bg-surface-muted rounded mb-6" />
      <div className="h-3 w-24 bg-surface-muted rounded mb-4" />
      <div className="h-10 w-3/4 bg-surface-muted rounded mb-6" />
      <div className="aspect-[16/9] bg-surface-muted rounded-xl mb-8" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-surface-muted rounded" />
        <div className="h-4 w-5/6 bg-surface-muted rounded" />
        <div className="h-4 w-4/5 bg-surface-muted rounded" />
        <div className="h-4 w-full bg-surface-muted rounded" />
        <div className="h-4 w-2/3 bg-surface-muted rounded" />
      </div>
    </div>
  );
}

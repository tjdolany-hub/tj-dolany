type QueryResult = { error: { message: string } | null };

/**
 * Run a Supabase query, retrying once on error. Errors are logged (visible in
 * Vercel runtime logs) instead of silently rendering empty sections.
 * `run` must build a fresh query each call — a builder can't be awaited twice.
 */
export async function queryWithRetry<T extends QueryResult>(label: string, run: () => PromiseLike<T>): Promise<T> {
  const first = await run();
  if (!first.error) return first;
  console.error(`[supabase] ${label} failed, retrying: ${first.error.message}`);
  const second = await run();
  if (second.error) console.error(`[supabase] ${label} failed again: ${second.error.message}`);
  return second;
}

/** Throw when any critical query failed, so the error boundary asks the visitor to reload. */
export function assertLoaded(page: string, results: Record<string, QueryResult>): void {
  const failed = Object.entries(results).filter(([, r]) => r.error).map(([name]) => name);
  if (failed.length > 0) {
    throw new Error(`[${page}] data se nepodařilo načíst: ${failed.join(", ")}`);
  }
}

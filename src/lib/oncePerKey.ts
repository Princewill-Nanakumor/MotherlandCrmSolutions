/**
 * Run `work` at most once per key. Concurrent callers share the same
 * in-flight Promise so expensive one-shot jobs (e.g. tenant backfills) do
 * not stack. Failed runs clear the key so a later call can retry.
 */
export function runOncePerKey(
  cache: Map<string, Promise<void>>,
  key: string,
  work: () => Promise<void>,
): Promise<void> {
  const existing = cache.get(key);
  if (existing) return existing;

  const pending = work().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, pending);
  return pending;
}

import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";

const cache = new Map<string, { sec: number; fetchedAt: number }>();
const CACHE_MS = 20_000;
/** Hard cap so a long-running serverless instance cannot leak unbounded entries. */
const MAX_ENTRIES = 5_000;

function rememberInCache(userId: string, entry: { sec: number; fetchedAt: number }): void {
  // Re-set keeps insertion order (Map iterates in insertion order) so the
  // first-keys() drop below behaves as approximate LRU.
  cache.delete(userId);
  cache.set(userId, entry);
  if (cache.size <= MAX_ENTRIES) return;
  let drop = cache.size - MAX_ENTRIES;
  for (const k of cache.keys()) {
    if (drop <= 0) break;
    cache.delete(k);
    drop -= 1;
  }
}

/**
 * Unix seconds when the password was last rotated (`passwordChangedAt`), or 0.
 * Short in-memory cache limits DB reads on hot JWT/session paths. Cache is
 * per-instance: cross-instance invalidation propagates within `CACHE_MS`.
 */
export async function getPasswordChangedAtUnixCached(
  userId: string,
): Promise<number> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && now - hit.fetchedAt < CACHE_MS) {
    return hit.sec;
  }

  await connectMongoDB();
  const doc = await User.findById(userId)
    .select({ passwordChangedAt: 1 })
    .lean<{ passwordChangedAt?: Date } | null>();

  const sec = doc?.passwordChangedAt
    ? Math.floor(new Date(doc.passwordChangedAt).getTime() / 1000)
    : 0;

  rememberInCache(userId, { sec, fetchedAt: now });
  return sec;
}

export function invalidatePasswordChangedAtCache(userId: string): void {
  cache.delete(userId);
}

import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { probeMongoQuery } from "@/lib/mongoPerfProbe";
import {
  sessionPerfMark,
  sessionPerfNote,
} from "@/lib/sessionPerfProbe";

const cache = new Map<string, { sec: number; fetchedAt: number }>();
const CACHE_MS = 30_000;
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
    sessionPerfNote(
      "passwordCache",
      `hit ageMs=${now - hit.fetchedAt}`,
    );
    return hit.sec;
  }

  sessionPerfNote("passwordCache", "miss");
  const connectStarted = performance.now();
  await connectMongoDB();
  sessionPerfMark(
    "passwordConnectMongo",
    `${(performance.now() - connectStarted).toFixed(1)}ms`,
  );

  const doc = await probeMongoQuery(
    "passwordFindById",
    "mongoose",
    () =>
      User.findById(userId)
        .select({ passwordChangedAt: 1 })
        .lean<{ passwordChangedAt?: Date } | null>(),
    {
      collection: "users",
      filter: { _id: userId },
    },
  );

  const sec = doc?.passwordChangedAt
    ? Math.floor(new Date(doc.passwordChangedAt).getTime() / 1000)
    : 0;

  rememberInCache(userId, { sec, fetchedAt: now });
  return sec;
}

export function invalidatePasswordChangedAtCache(userId: string): void {
  cache.delete(userId);
}

/** Populate cache after a coalesced JWT session read. */
export function seedPasswordChangedAtCache(userId: string, sec: number): void {
  rememberInCache(userId, { sec, fetchedAt: Date.now() });
}

/** Test/diagnostics: whether the in-memory password cache currently has an entry. */
export function peekPasswordChangedAtCache(
  userId: string,
): { hit: boolean; ageMs: number | null; sec: number | null } {
  const hit = cache.get(userId);
  if (!hit) return { hit: false, ageMs: null, sec: null };
  return { hit: true, ageMs: Date.now() - hit.fetchedAt, sec: hit.sec };
}

/**
 * Distributed captcha "consume once" store.
 *
 * **Default (no extra env):** uses MongoDB collection `captcha_consumed` — same
 * `MONGODB_URI` you already use. Nothing to add to `.env` for this to work.
 *
 * **Optional:** set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` if you
 * want Redis-first; otherwise those variables are ignored.
 */
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";

const COLLECTION = "captcha_consumed";

/** Optional Upstash REST (no npm package). If unset, returns null and Mongo is used. */
function upstashEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

/**
 * SET key value NX EX ttl — returns true if this process was the first to claim the key.
 * REST shape: `SET foo bar NX EX 60` → `/set/foo/bar/NX/EX/60` (Upstash REST semantics).
 */
async function tryConsumeUpstash(
  key: string,
  ttlSeconds: number,
): Promise<boolean | null> {
  const env = upstashEnv();
  if (!env) return null;
  try {
    const path = `/set/${encodeURIComponent(key)}/1/NX/EX/${ttlSeconds}`;
    const r = await fetch(`${env.url}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.token}` },
    });
    if (!r.ok) {
      console.warn("Upstash captcha SET NX failed:", r.status, await r.text());
      return null;
    }
    const raw = await r.text();
    let body: { result?: string | null };
    try {
      body = JSON.parse(raw) as { result?: string | null };
    } catch {
      return raw.trim() === "OK" ? true : null;
    }
    if (body.result === "OK") return true;
    if (body.result === null) return false;
    return null;
  } catch (e) {
    console.warn("Upstash captcha consume:", e);
    return null;
  }
}

let ttlIndexEnsured = false;

async function ensureMongoTtlIndex(): Promise<void> {
  if (ttlIndexEnsured) return;
  const db = mongoose.connection.db;
  if (!db) return;
  try {
    await db.collection(COLLECTION).createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, background: true },
    );
    // Only flip the gate on success; a transient Mongo failure must not
    // permanently disable TTL eviction for the lifetime of this instance.
    ttlIndexEnsured = true;
  } catch (e) {
    console.warn("captcha_consumed TTL index:", e);
  }
}

function isDuplicateKeyError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: number }).code === 11000
  );
}

/** In-process fallback when Mongo/Upstash is unavailable (single-instance semantics). */
const memoryConsumed = new Map<string, number>();
const MEMORY_MAX = 5000;

function pruneMemory(now: number): void {
  for (const [k, exp] of memoryConsumed) {
    if (exp <= now) memoryConsumed.delete(k);
  }
  if (memoryConsumed.size <= MEMORY_MAX) return;
  let drop = memoryConsumed.size - MEMORY_MAX;
  for (const k of memoryConsumed.keys()) {
    if (drop <= 0) break;
    memoryConsumed.delete(k);
    drop -= 1;
  }
}

function tryConsumeMemory(sig: string, ttlMs: number): boolean {
  const now = Date.now();
  pruneMemory(now);
  if (memoryConsumed.has(sig)) return false;
  memoryConsumed.set(sig, now + ttlMs);
  return true;
}

/**
 * Atomically records that this captcha signature was used. Returns true on
 * first use, false if already consumed (replay) or invalid state.
 *
 * Order: Upstash (if configured) → MongoDB insert (duplicate = replay) → memory fallback.
 */
export async function tryConsumeCaptchaSignatureOnce(
  sig: string,
  ttlMs: number,
): Promise<boolean> {
  const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
  const redisKey = `ml:captcha:${sig}`;

  const upstash = await tryConsumeUpstash(redisKey, ttlSeconds);
  if (upstash !== null) {
    return upstash;
  }

  try {
    await connectMongoDB();
    await ensureMongoTtlIndex();
    const db = mongoose.connection.db;
    if (!db) return tryConsumeMemory(sig, ttlMs);

    await db
      .collection<{ _id: string; expiresAt: Date }>(COLLECTION)
      .insertOne({
        _id: sig,
        expiresAt: new Date(Date.now() + ttlMs),
      });
    return true;
  } catch (e) {
    if (isDuplicateKeyError(e)) return false;
    console.error("captcha Mongo consume:", e);
    return tryConsumeMemory(sig, ttlMs);
  }
}

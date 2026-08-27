/**
 * Shared import pipeline knobs (client staging + worker drain + per-chunk quota).
 * Override via env for A/B benches without code edits.
 */
export const IMPORT_CLIENT_CHUNK_SIZE = Math.max(
  100,
  Number(process.env.IMPORT_CLIENT_CHUNK_SIZE || 5_000),
);

/** Chunks processed per worker tick before releasing the lease. */
export const IMPORT_WORKER_CHUNKS = Math.max(
  1,
  Number(process.env.IMPORT_WORKER_CHUNKS || 100),
);

/**
 * per-chunk — legacy: find + quota check + reconcile every chunk (slow)
 * job — create-time quota only; upsert without pre-find; reconcile once at job end
 */
export type ImportChunkQuotaMode = "per-chunk" | "job";

export function getImportChunkQuotaMode(): ImportChunkQuotaMode {
  const raw = String(process.env.IMPORT_CHUNK_QUOTA || "job").toLowerCase();
  return raw === "per-chunk" ? "per-chunk" : "job";
}

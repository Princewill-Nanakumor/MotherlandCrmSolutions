import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { probeMongoQuery } from "@/lib/mongoPerfProbe";
import { sanitizeSubAdminPermissions } from "@/lib/roles";
import {
  sessionPerfMark,
  sessionPerfNote,
} from "@/lib/sessionPerfProbe";

export type SessionRbacSnapshot = {
  role: string;
  permissions: string[];
  status: string;
  adminId?: string;
  canViewPhoneNumbers: boolean;
  canViewEmails: boolean;
};

const cache = new Map<string, { value: SessionRbacSnapshot; fetchedAt: number }>();
/**
 * Keep RBAC hot across a short burst of API calls (create user → refetch list).
 * Admin permission edits still call {@link invalidateSessionRbacCache}.
 */
const CACHE_MS = 30_000;
const MAX_ENTRIES = 5_000;

function rememberInCache(
  userId: string,
  entry: { value: SessionRbacSnapshot; fetchedAt: number },
): void {
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
 * Live role/permissions/contact flags for JWT refresh.
 * Per-instance cache; admin updates should call {@link invalidateSessionRbacCache}.
 */
export async function getSessionRbacFromDbCached(
  userId: string,
): Promise<SessionRbacSnapshot | null> {
  const now = Date.now();
  const hit = cache.get(userId);
  if (hit && now - hit.fetchedAt < CACHE_MS) {
    sessionPerfNote(
      "rbacCache",
      `hit ageMs=${now - hit.fetchedAt}`,
    );
    return hit.value;
  }

  sessionPerfNote("rbacCache", "miss");
  const connectStarted = performance.now();
  await connectMongoDB();
  sessionPerfMark(
    "rbacConnectMongo",
    `${(performance.now() - connectStarted).toFixed(1)}ms`,
  );

  const doc = await probeMongoQuery(
    "rbacFindById",
    "mongoose",
    () =>
      User.findById(userId)
        .select({
          role: 1,
          permissions: 1,
          status: 1,
          adminId: 1,
          canViewPhoneNumbers: 1,
          canViewEmails: 1,
        })
        .lean<{
          role?: string;
          permissions?: string[];
          status?: string;
          adminId?: { toString(): string } | string;
          canViewPhoneNumbers?: boolean;
          canViewEmails?: boolean;
        } | null>(),
    {
      collection: "users",
      filter: { _id: userId },
    },
  );

  if (!doc?.role) return null;

  const role = String(doc.role);
  const value: SessionRbacSnapshot = {
    role,
    permissions: sanitizeSubAdminPermissions(
      role,
      Array.isArray(doc.permissions) ? doc.permissions : [],
    ),
    status: doc.status ? String(doc.status) : "ACTIVE",
    adminId: doc.adminId ? String(doc.adminId) : undefined,
    canViewPhoneNumbers: doc.canViewPhoneNumbers === true,
    canViewEmails: doc.canViewEmails === true,
  };

  rememberInCache(userId, { value, fetchedAt: now });
  return value;
}

export function invalidateSessionRbacCache(userId: string): void {
  cache.delete(userId);
}

/** Populate cache after a coalesced JWT session read. */
export function seedSessionRbacCache(
  userId: string,
  value: SessionRbacSnapshot,
): void {
  rememberInCache(userId, { value, fetchedAt: Date.now() });
}

/** Test/diagnostics: whether the in-memory RBAC cache currently has an entry. */
export function peekSessionRbacCache(
  userId: string,
): { hit: boolean; ageMs: number | null; value: SessionRbacSnapshot | null } {
  const hit = cache.get(userId);
  if (!hit) return { hit: false, ageMs: null, value: null };
  return { hit: true, ageMs: Date.now() - hit.fetchedAt, value: hit.value };
}

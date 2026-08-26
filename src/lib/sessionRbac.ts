import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { sanitizeSubAdminPermissions } from "@/lib/roles";

export type SessionRbacSnapshot = {
  role: string;
  permissions: string[];
  status: string;
  adminId?: string;
  canViewPhoneNumbers: boolean;
  canViewEmails: boolean;
};

const cache = new Map<string, { value: SessionRbacSnapshot; fetchedAt: number }>();
/** Short TTL so admin checkbox changes show up after a normal page refresh. */
const CACHE_MS = 5_000;
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
    return hit.value;
  }

  await connectMongoDB();
  const doc = await User.findById(userId)
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
    } | null>();

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

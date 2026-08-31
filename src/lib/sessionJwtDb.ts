/**
 * Coalesced JWT session DB reads — one findById when password + RBAC both miss,
 * avoiding parallel pool cold-start (~1s) on back-to-back creates.
 */
import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { probeMongoQuery } from "@/lib/mongoPerfProbe";
import { sanitizeSubAdminPermissions } from "@/lib/roles";
import {
  peekPasswordChangedAtCache,
  seedPasswordChangedAtCache,
} from "@/lib/authPasswordVersion";
import {
  peekSessionRbacCache,
  seedSessionRbacCache,
  type SessionRbacSnapshot,
} from "@/lib/sessionRbac";
import {
  sessionPerfMark,
  sessionPerfNote,
} from "@/lib/sessionPerfProbe";

export type JwtSessionDbResult = {
  passwordChangedAtUnix: number;
  rbac: SessionRbacSnapshot | null;
};

const inFlight = new Map<string, Promise<JwtSessionDbResult>>();

function rbacFromDoc(doc: {
  role?: string;
  permissions?: string[];
  status?: string;
  adminId?: { toString(): string } | string;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}): SessionRbacSnapshot | null {
  if (!doc.role) return null;
  const role = String(doc.role);
  return {
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
}

type JwtUserDoc = {
  passwordChangedAt?: Date;
  role?: string;
  permissions?: string[];
  status?: string;
  adminId?: { toString(): string } | string;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
};

async function loadJwtSessionFromDb(
  userId: string,
  refreshRbac: boolean,
): Promise<JwtSessionDbResult> {
  const needPassword = !peekPasswordChangedAtCache(userId).hit;
  const needRbac = refreshRbac && !peekSessionRbacCache(userId).hit;

  if (!needPassword && !needRbac) {
    return resolveJwtSessionDbFromCache(userId, refreshRbac);
  }

  const connectStarted = performance.now();
  await connectMongoDB();
  sessionPerfMark(
    "jwtConnectMongo",
    `${(performance.now() - connectStarted).toFixed(1)}ms`,
  );

  const select = {
    ...(needPassword ? { passwordChangedAt: 1 } : {}),
    ...(needRbac
      ? {
          role: 1,
          permissions: 1,
          status: 1,
          adminId: 1,
          canViewPhoneNumbers: 1,
          canViewEmails: 1,
        }
      : {}),
  };

  const label =
    needPassword && needRbac
      ? "jwtSessionFindById"
      : needPassword
        ? "passwordFindById"
        : "rbacFindById";

  const doc = await probeMongoQuery(
    label,
    "mongoose",
    () => User.findById(userId).select(select).lean<JwtUserDoc | null>(),
    { collection: "users", filter: { _id: userId } },
  );

  let passwordChangedAtUnix = 0;
  if (needPassword) {
    passwordChangedAtUnix = doc?.passwordChangedAt
      ? Math.floor(new Date(doc.passwordChangedAt).getTime() / 1000)
      : 0;
    seedPasswordChangedAtCache(userId, passwordChangedAtUnix);
  } else {
    passwordChangedAtUnix = resolveJwtSessionDbFromCache(
      userId,
      false,
    ).passwordChangedAtUnix;
  }

  let rbac: SessionRbacSnapshot | null = null;
  if (needRbac && doc) {
    rbac = rbacFromDoc(doc);
    if (rbac) seedSessionRbacCache(userId, rbac);
  } else if (refreshRbac) {
    rbac = resolveJwtSessionDbFromCache(userId, true).rbac;
  }

  return { passwordChangedAtUnix, rbac };
}

function resolveJwtSessionDbFromCache(
  userId: string,
  refreshRbac: boolean,
): JwtSessionDbResult {
  const pwd = peekPasswordChangedAtCache(userId);
  const passwordChangedAtUnix = pwd.hit && pwd.sec != null ? pwd.sec : 0;

  let rbac: SessionRbacSnapshot | null = null;
  if (refreshRbac) {
    const rbacPeek = peekSessionRbacCache(userId);
    rbac = rbacPeek.hit ? (rbacPeek.value ?? null) : null;
  }

  return { passwordChangedAtUnix, rbac };
}

/**
 * Password version + optional RBAC refresh for the JWT callback.
 * Uses one Mongo round-trip when both caches miss.
 */
export async function resolveJwtSessionDb(
  userId: string,
  refreshRbac: boolean,
): Promise<JwtSessionDbResult> {
  const pwdPeek = peekPasswordChangedAtCache(userId);
  if (pwdPeek.hit) {
    sessionPerfNote("passwordCache", `hit ageMs=${pwdPeek.ageMs}`);
  } else {
    sessionPerfNote("passwordCache", "miss");
  }

  if (refreshRbac) {
    const rbacPeek = peekSessionRbacCache(userId);
    if (rbacPeek.hit) {
      sessionPerfNote("rbacCache", `hit ageMs=${rbacPeek.ageMs}`);
    } else {
      sessionPerfNote("rbacCache", "miss");
    }
  }

  const pwdReady = pwdPeek.hit;
  const rbacReady = !refreshRbac || peekSessionRbacCache(userId).hit;
  if (pwdReady && rbacReady) {
    return resolveJwtSessionDbFromCache(userId, refreshRbac);
  }

  const key = `${userId}:${refreshRbac}`;
  let pending = inFlight.get(key);
  if (!pending) {
    pending = loadJwtSessionFromDb(userId, refreshRbac).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending);
  }
  return pending;
}

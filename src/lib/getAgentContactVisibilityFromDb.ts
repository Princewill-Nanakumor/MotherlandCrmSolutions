import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { isTenantStaff } from "@/lib/roles";

/** Duck-typed DB so Mongoose's bundled `mongodb` and top-level `mongodb` both work. */
type MongoDatabaseLike = {
  collection: (name: string) => {
    findOne: (
      filter: Record<string, unknown>,
      options?: { projection?: Record<string, 0 | 1> },
    ) => Promise<{
      canViewEmails?: unknown;
      canViewPhoneNumbers?: unknown;
    } | null>;
  };
};

/** Minimal session user shape for PII flags (matches GET /api/users/me resolution). */
export type AgentPiiSessionInput = {
  user: {
    id?: string | null;
    email?: string | null;
    adminId?: string | null;
    role?: string;
  };
};

const piiProjection = {
  canViewEmails: 1,
  canViewPhoneNumbers: 1,
} as const;

/**
 * Same `users` lookup order as GET /api/users/me for agents, then fallbacks:
 * - ObjectId `adminId` (Mongoose stores adminId as ObjectId; /me uses string in query)
 * - email-only (again, same as /me)
 * - JWT `sub` / session user id (last resort)
 *
 * Previously, lead routes preferred `_id` first. That can return a row whose flags
 * disagree with `/api/users/me` (e.g. duplicate email, stale id), so the UI showed
 * `canViewEmails: true` while GET /api/leads/[id] still masked.
 */
async function findAgentUserForPiiPermissions(
  db: MongoDatabaseLike,
  user: NonNullable<AgentPiiSessionInput["user"]>,
) {
  if (!isTenantStaff(user.role)) return null;
  const rawEmail =
    typeof user.email === "string" ? user.email.trim() : "";
  if (!rawEmail) return null;
  // User model stores email lowercase; JWT may differ in casing.
  const email = rawEmail.toLowerCase();

  // 1) Match GET /api/users/me exactly (adminId as stored in JWT — string)
  const qMe: Record<string, unknown> = { email };
  if (user.adminId) {
    qMe.adminId = user.adminId;
  }
  let doc = await db.collection("users").findOne(qMe, {
    projection: piiProjection,
  });
  if (doc) return doc;

  // 2) DB stores adminId as ObjectId — native /me query may miss; try ObjectId
  if (
    user.adminId &&
    mongoose.Types.ObjectId.isValid(String(user.adminId))
  ) {
    doc = await db.collection("users").findOne(
      {
        email,
        adminId: new ObjectId(String(user.adminId)),
      },
      { projection: piiProjection },
    );
    if (doc) return doc;
  }

  // 3) /api/users/me agent fallback: email only (lowercase)
  doc = await db.collection("users").findOne({ email }, { projection: piiProjection });
  if (doc) return doc;

  if (rawEmail !== email) {
    doc = await db.collection("users").findOne(
      { email: rawEmail },
      { projection: piiProjection },
    );
    if (doc) return doc;
  }

  // 4) Last resort: session user id
  if (user.id && mongoose.Types.ObjectId.isValid(user.id)) {
    doc = await db.collection("users").findOne(
      { _id: new ObjectId(user.id) },
      { projection: piiProjection },
    );
  }

  return doc;
}

/**
 * Resolves whether an AGENT may see unmasked lead email/phone — aligned with
 * GET /api/users/me user resolution, not `_id`-only.
 */
export async function getAgentContactVisibilityFromDb(
  db: MongoDatabaseLike,
  session: AgentPiiSessionInput,
): Promise<{ canViewEmails: boolean; canViewPhoneNumbers: boolean }> {
  if (!isTenantStaff(session.user.role)) {
    return { canViewEmails: true, canViewPhoneNumbers: true };
  }

  const me = await findAgentUserForPiiPermissions(db, session.user);

  return {
    canViewEmails: Boolean(me?.canViewEmails),
    canViewPhoneNumbers: Boolean(me?.canViewPhoneNumbers),
  };
}

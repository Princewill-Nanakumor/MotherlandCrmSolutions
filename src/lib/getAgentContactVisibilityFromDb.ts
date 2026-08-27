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
 * Same `users` lookup order as GET /api/users/me:
 * - JWT `_id` first (stable across role changes)
 * - email + ObjectId `adminId`
 * - email-only fallback
 */
async function findAgentUserForPiiPermissions(
  db: MongoDatabaseLike,
  user: NonNullable<AgentPiiSessionInput["user"]>,
) {
  if (!isTenantStaff(user.role)) return null;

  // 1) Prefer session user id — matches /api/users/me
  if (user.id && mongoose.Types.ObjectId.isValid(user.id)) {
    const byId = await db.collection("users").findOne(
      { _id: new ObjectId(user.id) },
      { projection: piiProjection },
    );
    if (byId) return byId;
  }

  const rawEmail =
    typeof user.email === "string" ? user.email.trim() : "";
  if (!rawEmail) return null;
  // User model stores email lowercase; JWT may differ in casing.
  const email = rawEmail.toLowerCase();

  // 2) email + adminId as ObjectId (how Mongo stores it)
  if (
    user.adminId &&
    mongoose.Types.ObjectId.isValid(String(user.adminId))
  ) {
    const doc = await db.collection("users").findOne(
      {
        email,
        adminId: new ObjectId(String(user.adminId)),
      },
      { projection: piiProjection },
    );
    if (doc) return doc;
  }

  // 3) email + adminId as JWT string (legacy /me shape)
  if (user.adminId) {
    const doc = await db.collection("users").findOne(
      { email, adminId: user.adminId },
      { projection: piiProjection },
    );
    if (doc) return doc;
  }

  // 4) email-only fallback
  let doc = await db.collection("users").findOne({ email }, { projection: piiProjection });
  if (doc) return doc;

  if (rawEmail !== email) {
    doc = await db.collection("users").findOne(
      { email: rawEmail },
      { projection: piiProjection },
    );
  }

  return doc;
}

/**
 * Resolves whether tenant staff may see unmasked lead email/phone — aligned with
 * GET /api/users/me user resolution (prefer session user id).
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

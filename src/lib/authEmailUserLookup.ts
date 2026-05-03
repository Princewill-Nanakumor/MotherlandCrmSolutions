import type { FilterQuery } from "mongoose";
import User, { type IUser } from "@/models/User";

/**
 * Resolve a user by email preferring the tenant-owner row (`role: "ADMIN"`)
 * when multiple records could match. Avoids relying on lexicographic role
 * sort, which would silently break if the role names ever change.
 */
async function pickAdminFirst(
  filter: FilterQuery<IUser>,
): Promise<IUser | null> {
  const admin = await User.findOne({ ...filter, role: "ADMIN" });
  if (admin) return admin;
  return User.findOne(filter);
}

/**
 * Password reset email is only issued for tenant administrators (`ADMIN`),
 * including super-admins (same role; allowlist is enforced at session/routes).
 * Agent accounts must reset via their admin, not self-service email.
 */
export function findUserForPasswordResetByEmail(email: string) {
  return User.findOne({ email, role: "ADMIN" });
}

/** Unverified users only; still prefer ADMIN when multiple rows match. */
export function findUserForResendVerificationByEmail(email: string) {
  return pickAdminFirst({ email, emailVerified: false });
}

/** Credentials login: same ADMIN-first policy when resolving by email. */
export function findUserForCredentialLoginByEmail(email: string) {
  return pickAdminFirst({ email });
}

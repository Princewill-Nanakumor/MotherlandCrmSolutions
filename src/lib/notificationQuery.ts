import type { Session } from "next-auth";
import mongoose from "mongoose";

export function getSuperAdminEmails(): string[] {
  return (
    process.env.SUPER_ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? []
  ).filter(Boolean);
}

export function isSuperAdminSession(session: Session): boolean {
  if (session.user?.role !== "ADMIN") return false;
  const email = session.user?.email?.trim();
  if (!email) return false;
  return getSuperAdminEmails().includes(email);
}

/** Match notification id from URL (string id or Mongo _id). */
export function notificationIdSelectors(id: string): Record<string, unknown>[] {
  const selectors: Record<string, unknown>[] = [{ id }];
  if (mongoose.Types.ObjectId.isValid(id)) {
    selectors.push({ _id: new mongoose.Types.ObjectId(id) });
  }
  return selectors;
}

/** Owner must match session user (string or ObjectId userId on document). */
export function notificationOwnerSelectors(session: Session): Record<string, unknown>[] {
  const uid = session.user?.id;
  if (!uid) {
    return [{ userId: "__invalid__" }];
  }
  const out: Record<string, unknown>[] = [{ userId: uid }];
  if (mongoose.Types.ObjectId.isValid(uid)) {
    out.push({ userId: new mongoose.Types.ObjectId(uid) });
  }
  return out;
}

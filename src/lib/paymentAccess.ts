import type { Session } from "next-auth";
import mongoose from "mongoose";
import { isSuperAdminSession } from "@/lib/notificationQuery";

export interface PaymentTenantFields {
  _id?: mongoose.Types.ObjectId | string;
  adminId?: mongoose.Types.ObjectId | { toString: () => string } | null;
  createdBy?: mongoose.Types.ObjectId | { toString: () => string } | null;
}

/** Only tenant admins (and super admins) may create or list payments. */
export function canManagePayments(session: Session | null): boolean {
  if (!session?.user?.id) return false;
  return session.user.role === "ADMIN";
}

/**
 * Super admins can read any payment. Tenant admins can only read payments for
 * their account (payment.adminId). Agents and other roles cannot read payments.
 */
export function canReadPayment(
  session: Session | null,
  payment: PaymentTenantFields,
): boolean {
  if (!session?.user?.id) return false;
  const sessionTyped = session as Session;

  if (isSuperAdminSession(sessionTyped)) return true;

  if (session.user.role !== "ADMIN") return false;

  const tenantId =
    payment.adminId != null ? String(payment.adminId) : "";

  return tenantId !== "" && tenantId === session.user.id;
}

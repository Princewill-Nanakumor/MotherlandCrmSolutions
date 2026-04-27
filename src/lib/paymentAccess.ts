import type { Session } from "next-auth";
import mongoose from "mongoose";
import { isSuperAdminSession } from "@/lib/notificationQuery";

export interface PaymentTenantFields {
  _id?: mongoose.Types.ObjectId | string;
  adminId?: mongoose.Types.ObjectId | { toString: () => string } | null;
  createdBy?: mongoose.Types.ObjectId | { toString: () => string } | null;
}

/**
 * Super admins can read any payment. Admin can only read payments for their
 * tenant (payment.adminId). Other users may only read payments they created.
 */
export function canReadPayment(
  session: Session | null,
  payment: PaymentTenantFields,
): boolean {
  if (!session?.user?.id) return false;
  const sessionTyped = session as Session;

  if (isSuperAdminSession(sessionTyped)) return true;

  const tenantId =
    payment.adminId != null ? String(payment.adminId) : "";

  if (session.user.role === "ADMIN") {
    return tenantId !== "" && tenantId === session.user.id;
  }

  const creatorId =
    payment.createdBy != null ? String(payment.createdBy) : "";
  return creatorId !== "" && creatorId === session.user.id;
}

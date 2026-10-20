import type { Session } from "next-auth";
import mongoose from "mongoose";
import { isSuperAdminSession } from "@/lib/notificationQuery";

export interface PaymentTenantFields {
  _id?: mongoose.Types.ObjectId | string;
  adminId?:
    | mongoose.Types.ObjectId
    | string
    | { _id?: mongoose.Types.ObjectId | string; toString?: () => string }
    | null;
  createdBy?:
    | mongoose.Types.ObjectId
    | string
    | { _id?: mongoose.Types.ObjectId | string; toString?: () => string }
    | null;
}

function partyRefId(value: PaymentTenantFields["adminId"]): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value && value._id != null) {
    return String(value._id);
  }
  if (
    typeof value === "object" &&
    typeof value.toString === "function"
  ) {
    const asString = value.toString();
    if (asString && asString !== "[object Object]") return asString;
  }
  return String(value);
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

  const tenantId = partyRefId(payment.adminId);

  return tenantId !== "" && tenantId === session.user.id;
}

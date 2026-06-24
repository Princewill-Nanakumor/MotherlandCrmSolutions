import mongoose from "mongoose";
import User from "@/models/User";

export type PaymentPartySummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  displayName: string;
};

type PaymentLike = {
  _id: mongoose.Types.ObjectId | string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  transactionId: string;
  description?: string;
  network?: string;
  walletAddress?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  approvedAt?: Date | string;
  rejectedAt?: Date | string;
  createdBy?: mongoose.Types.ObjectId | string;
  approvedBy?: mongoose.Types.ObjectId | string;
  adminId?: mongoose.Types.ObjectId | string;
};

type UserLean = {
  _id: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

function toDisplayName(firstName?: string, lastName?: string, email?: string) {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  if (full) return full;
  return email?.trim() || "Unknown user";
}

function toPartySummary(user: UserLean): PaymentPartySummary {
  return {
    id: user._id.toString(),
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    role: user.role ?? "",
    displayName: toDisplayName(user.firstName, user.lastName, user.email),
  };
}

async function loadPartyMap(
  ids: Array<string | mongoose.Types.ObjectId | undefined>,
): Promise<Map<string, PaymentPartySummary>> {
  const uniqueIds = [
    ...new Set(
      ids
        .filter(Boolean)
        .map((id) => String(id))
        .filter((id) => mongoose.Types.ObjectId.isValid(id)),
    ),
  ];

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const users = (await User.find({
    _id: { $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select({ firstName: 1, lastName: 1, email: 1, role: 1 })
    .lean()) as UserLean[];

  const map = new Map<string, PaymentPartySummary>();
  for (const user of users) {
    map.set(user._id.toString(), toPartySummary(user));
  }
  return map;
}

export async function enrichPaymentForResponse<T extends PaymentLike>(
  payment: T,
): Promise<
  T & {
    _id: string;
    createdBy?: string;
    approvedBy?: string;
    adminId?: string;
    submittedBy: PaymentPartySummary | null;
    tenantAccount: PaymentPartySummary | null;
    approvedByUser: PaymentPartySummary | null;
  }
> {
  const partyMap = await loadPartyMap([
    payment.createdBy,
    payment.adminId,
    payment.approvedBy,
  ]);

  const createdById = payment.createdBy ? String(payment.createdBy) : "";
  const adminId = payment.adminId ? String(payment.adminId) : "";
  const approvedById = payment.approvedBy ? String(payment.approvedBy) : "";

  return {
    ...payment,
    _id: String(payment._id),
    createdBy: createdById || undefined,
    approvedBy: approvedById || undefined,
    adminId: adminId || undefined,
    submittedBy: createdById ? partyMap.get(createdById) ?? null : null,
    tenantAccount: adminId ? partyMap.get(adminId) ?? null : null,
    approvedByUser: approvedById ? partyMap.get(approvedById) ?? null : null,
  };
}

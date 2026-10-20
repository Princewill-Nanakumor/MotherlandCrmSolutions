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
  createdBy?: mongoose.Types.ObjectId | string | UserLean | null;
  approvedBy?: mongoose.Types.ObjectId | string | UserLean | null;
  adminId?: mongoose.Types.ObjectId | string | UserLean | null;
};

type UserLean = {
  _id: mongoose.Types.ObjectId | string;
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
    id: String(user._id),
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    role: user.role ?? "",
    displayName: toDisplayName(user.firstName, user.lastName, user.email),
  };
}

function isPopulatedUser(value: unknown): value is UserLean {
  return (
    typeof value === "object" &&
    value !== null &&
    "_id" in value &&
    ("email" in value || "firstName" in value || "lastName" in value)
  );
}

/** Normalize ObjectId | string | populated user → hex id string. */
function normalizePartyId(value: unknown): string {
  if (!value) return "";
  if (isPopulatedUser(value)) return String(value._id);
  if (typeof value === "string") {
    return mongoose.Types.ObjectId.isValid(value) ? value : "";
  }
  if (typeof value === "object" && value !== null && "toHexString" in value) {
    try {
      return (value as { toHexString: () => string }).toHexString();
    } catch {
      /* fall through */
    }
  }
  const asString = String(value);
  if (!asString || asString === "[object Object]") return "";
  return mongoose.Types.ObjectId.isValid(asString) ? asString : "";
}

async function loadPartyMap(
  ids: Array<string | undefined>,
): Promise<Map<string, PaymentPartySummary>> {
  const uniqueIds = [
    ...new Set(ids.filter((id): id is string => !!id && mongoose.Types.ObjectId.isValid(id))),
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
    map.set(String(user._id), toPartySummary(user));
  }
  return map;
}

function resolveParty(
  value: unknown,
  partyMap: Map<string, PaymentPartySummary>,
): PaymentPartySummary | null {
  if (!value) return null;
  if (isPopulatedUser(value)) return toPartySummary(value);
  const id = normalizePartyId(value);
  if (!id) return null;
  return partyMap.get(id) ?? null;
}

function resolveDepositWalletAddress(
  payment: PaymentLike,
): string | undefined {
  const stored = payment.walletAddress?.trim();
  if (stored) return stored;

  if (payment.method !== "CRYPTO") return undefined;
  if (payment.network === "TRC20") {
    return process.env.TRC20_WALLET_ADDRESS?.trim() || undefined;
  }
  if (payment.network === "ERC20") {
    return process.env.ERC20_WALLET_ADDRESS?.trim() || undefined;
  }
  return undefined;
}

export async function enrichPaymentForResponse<T extends PaymentLike>(
  payment: T,
): Promise<
  T & {
    _id: string;
    createdBy?: string;
    approvedBy?: string;
    adminId?: string;
    walletAddress?: string;
    submittedBy: PaymentPartySummary | null;
    tenantAccount: PaymentPartySummary | null;
    approvedByUser: PaymentPartySummary | null;
  }
> {
  const createdById = normalizePartyId(payment.createdBy);
  const adminId = normalizePartyId(payment.adminId);
  const approvedById = normalizePartyId(payment.approvedBy);

  const partyMap = await loadPartyMap([createdById, adminId, approvedById]);

  const submittedBy = resolveParty(payment.createdBy, partyMap);
  const tenantAccount = resolveParty(payment.adminId, partyMap);
  const approvedByUser = resolveParty(payment.approvedBy, partyMap);

  return {
    ...payment,
    _id: String(payment._id),
    createdBy: createdById || undefined,
    approvedBy: approvedById || undefined,
    adminId: adminId || undefined,
    walletAddress: resolveDepositWalletAddress(payment),
    submittedBy,
    tenantAccount,
    approvedByUser,
  };
}

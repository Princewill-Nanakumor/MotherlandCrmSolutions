import mongoose from "mongoose";
import Lead from "@/models/Lead";
import {
  buildPhoneDigitsMatchRegex,
  isCheckablePhone,
  phoneDigitsOnly,
} from "@/lib/phoneCheck";

export type LeadPhoneMatch = {
  _id: mongoose.Types.ObjectId;
  phone?: string;
  firstName: string;
  lastName: string;
};

/**
 * Find a tenant lead whose primary or secondary phone matches (digit-insensitive).
 */
export async function findTenantLeadByPhone(
  adminId: string,
  phone: string,
  options?: { excludeLeadId?: string },
): Promise<LeadPhoneMatch | null> {
  if (!isCheckablePhone(phone)) return null;

  const digits = phoneDigitsOnly(phone);
  const pattern = buildPhoneDigitsMatchRegex(digits);
  const filter: Record<string, unknown> = {
    adminId: new mongoose.Types.ObjectId(adminId),
    $or: [
      { phone: { $regex: pattern } },
      { "phones.value": { $regex: pattern } },
    ],
  };

  if (options?.excludeLeadId && mongoose.Types.ObjectId.isValid(options.excludeLeadId)) {
    filter._id = { $ne: new mongoose.Types.ObjectId(options.excludeLeadId) };
  }

  const existing = await Lead.findOne(filter)
    .select("_id phone firstName lastName")
    .lean<LeadPhoneMatch | null>();

  return existing ?? null;
}

/** Collect primary + secondary phone values to uniqueness-check. */
export function collectLeadPhoneValues(input: {
  phone?: string;
  phones?: Array<{ value?: string } | string>;
}): string[] {
  const values: string[] = [];
  const primary = String(input.phone ?? "").trim();
  if (primary) values.push(primary);

  if (Array.isArray(input.phones)) {
    for (const entry of input.phones) {
      const value =
        typeof entry === "string"
          ? entry.trim()
          : String(entry?.value ?? "").trim();
      if (value) values.push(value);
    }
  }

  // Dedupe by digits so we don't query the same number twice.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const digits = phoneDigitsOnly(value);
    if (!digits || seen.has(digits)) continue;
    seen.add(digits);
    unique.push(value);
  }
  return unique;
}

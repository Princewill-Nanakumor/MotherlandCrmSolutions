import type { Lead } from "@/types/leads";

/** Normalize Mongo/ObjectId status values to a string id for list + badge lookups. */
export function normalizeLeadStatusId(status: unknown): string {
  if (status == null) return "";
  if (typeof status === "string") return status;
  if (typeof status === "object") {
    const obj = status as { _id?: unknown; toString?: () => string };
    if (obj._id != null) return String(obj._id);
    if (typeof obj.toString === "function") {
      const value = obj.toString();
      if (value && value !== "[object Object]") return value;
    }
  }
  return String(status);
}

/** True when only the status field changed (already persisted via PATCH /status). */
export function isStatusOnlyLeadUpdate(original: Lead, updated: Lead): boolean {
  const hasStatusChange =
    normalizeLeadStatusId(updated.status) !==
    normalizeLeadStatusId(original.status);
  const hasOtherChanges =
    updated.firstName !== original.firstName ||
    updated.lastName !== original.lastName ||
    updated.email !== original.email ||
    updated.phone !== original.phone ||
    updated.source !== original.source ||
    updated.country !== original.country ||
    updated.comments !== original.comments ||
    JSON.stringify(updated.assignedTo) !== JSON.stringify(original.assignedTo);

  return hasStatusChange && !hasOtherChanges;
}

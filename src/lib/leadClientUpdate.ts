import type { Lead, LeadContactEntry } from "@/types/leads";

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

/**
 * List endpoints omit `emails`/`phones`. When syncing a richer panel/selected
 * lead from a list row, keep extras that the list payload never includes.
 * `undefined` means "list omitted"; `[]` means intentionally cleared.
 */
export function mergeLeadContactExtras(
  incoming: Lead,
  richer?: Pick<Lead, "emails" | "phones"> | null,
): Lead {
  if (!richer) return incoming;
  return {
    ...incoming,
    emails:
      incoming.emails !== undefined ? incoming.emails : richer.emails,
    phones:
      incoming.phones !== undefined ? incoming.phones : richer.phones,
  };
}

/** Preserve extras from `richer` only when both leads share the same id. */
export function mergeLeadContactExtrasIfSame(
  incoming: Lead,
  richer: Lead | null | undefined,
): Lead {
  if (!richer || richer._id !== incoming._id) return incoming;
  return mergeLeadContactExtras(incoming, richer);
}

/**
 * `undefined` on the updated lead means “field not part of this update”
 * (e.g. status PATCH payloads), not “clear all extras”.
 */
function contactExtrasUnchanged(
  original: LeadContactEntry[] | undefined,
  updated: LeadContactEntry[] | undefined,
): boolean {
  if (updated === undefined) return true;
  return JSON.stringify(updated) === JSON.stringify(original ?? []);
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
    !contactExtrasUnchanged(original.emails, updated.emails) ||
    !contactExtrasUnchanged(original.phones, updated.phones) ||
    updated.source !== original.source ||
    updated.country !== original.country ||
    updated.comments !== original.comments ||
    JSON.stringify(updated.assignedTo) !== JSON.stringify(original.assignedTo);

  return hasStatusChange && !hasOtherChanges;
}

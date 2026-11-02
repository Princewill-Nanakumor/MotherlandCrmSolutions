import type { Lead } from "@/types/leads";
import { normalizeLeadId } from "@/lib/leadId";

/** Sort fields the leads list API can apply before skip/limit. */
const LEAD_LIST_SERVER_SORT_FIELDS = [
  "lastActivityAt",
  "createdAt",
  "updatedAt",
  "statusChangedAt",
  "lastCommentDate",
  "lastComment",
  "lastCallInitiatedAt",
  "country",
  "source",
  "status",
  "name",
  "firstName",
  "leadId",
] as const;

export type LeadListServerSortField =
  (typeof LEAD_LIST_SERVER_SORT_FIELDS)[number];

export type LeadListSortOrder = "asc" | "desc";

const SERVER_SORT_SET = new Set<string>(LEAD_LIST_SERVER_SORT_FIELDS);

export function isLeadListServerSortField(
  field: string | null | undefined,
): field is LeadListServerSortField {
  return typeof field === "string" && SERVER_SORT_SET.has(field);
}

/** Date-like columns default to newest-first on first click. */
export function defaultLeadListSortOrder(
  field: string,
): LeadListSortOrder {
  switch (field) {
    case "lastCommentDate":
    case "lastCallInitiatedAt":
    case "lastActivityAt":
    case "createdAt":
    case "updatedAt":
    case "statusChangedAt":
      return "desc";
    default:
      return "asc";
  }
}

export function parseLeadListSort(
  sortFieldRaw: string | null,
  sortOrderRaw: string | null,
): { sortField: LeadListServerSortField; sortOrder: LeadListSortOrder } {
  const sortField = isLeadListServerSortField(sortFieldRaw)
    ? sortFieldRaw
    : "lastActivityAt";
  const sortOrder: LeadListSortOrder =
    sortOrderRaw === "asc" || sortOrderRaw === "desc"
      ? sortOrderRaw
      : defaultLeadListSortOrder(sortField);
  return { sortField, sortOrder };
}

/** UI-only sorts that stay page-local (not in Mongo list sort). */
const LEAD_LIST_UI_ONLY_SORT_FIELDS = new Set(["assignedTo", "commentCount"]);

/** Server sort fields plus UI-only columns used in table headers / URL state. */
export function isLeadListUiSortField(
  field: string | null | undefined,
): boolean {
  return (
    isLeadListServerSortField(field) ||
    (typeof field === "string" && LEAD_LIST_UI_ONLY_SORT_FIELDS.has(field))
  );
}

/**
 * Nullable / denorm columns that can disagree with Mongo order on a page
 * (null tie-break, or hydrate after sort). Re-order the visible page for these.
 */
const PAGE_RESORT_LIST_SORT_FIELDS = new Set([
  "lastCallInitiatedAt",
  "lastCommentDate",
  "lastComment",
  "statusChangedAt",
]);

export function isPageResortListSortField(field: string): boolean {
  return PAGE_RESORT_LIST_SORT_FIELDS.has(field);
}

export function parseLeadListUiSort(
  sortFieldRaw: string | null,
  sortOrderRaw: string | null,
): { sortField: string; sortOrder: LeadListSortOrder } {
  const sortField = isLeadListUiSortField(sortFieldRaw)
    ? (sortFieldRaw as string)
    : "lastActivityAt";
  const sortOrder: LeadListSortOrder =
    sortOrderRaw === "asc" || sortOrderRaw === "desc"
      ? sortOrderRaw
      : defaultLeadListSortOrder(sortField);
  return { sortField, sortOrder };
}

/**
 * Mongo sort document. `name` maps to firstName.
 * Tie-breakers keep pagination stable across equal values.
 */
export function buildLeadListMongoSort(
  sortField: LeadListServerSortField,
  sortOrder: LeadListSortOrder,
): Record<string, 1 | -1> {
  const dir: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  const mongoField = sortField === "name" ? "firstName" : sortField;
  const sort: Record<string, 1 | -1> = { [mongoField]: dir };

  if (mongoField !== "lastActivityAt") {
    sort.lastActivityAt = -1;
  }
  if (mongoField !== "updatedAt") {
    sort.updatedAt = -1;
  }
  sort._id = 1;
  return sort;
}

/**
 * Read sortField/sortOrder from all-leads / assigned-leads React Query keys.
 * Both put sort at indices 12 and 13.
 */
export function getListSortFromQueryKey(key: readonly unknown[]): {
  sortField: string;
  sortOrder: LeadListSortOrder;
} {
  if (key.length < 14) {
    return { sortField: "lastActivityAt", sortOrder: "desc" };
  }
  const root = key[0];
  if (root !== "leads" && root !== "assignedLeads") {
    return { sortField: "lastActivityAt", sortOrder: "desc" };
  }
  const sortField =
    typeof key[12] === "string" && key[12] ? key[12] : "lastActivityAt";
  const sortOrder: LeadListSortOrder = key[13] === "asc" ? "asc" : "desc";
  return { sortField, sortOrder };
}

/** False when sort changed — skip placeholder so the table doesn't keep old order. */
export function leadsListSortMatchesQueryKey(
  queryKey: readonly unknown[] | undefined,
  sortField: string,
  sortOrder: string,
): boolean {
  if (!queryKey || queryKey.length < 14) return false;
  const prev = getListSortFromQueryKey(queryKey);
  return prev.sortField === sortField && prev.sortOrder === sortOrder;
}

function activityTimeMs(lead: Lead): number {
  const raw = lead.lastActivityAt || lead.updatedAt || lead.createdAt;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function dateTimeMs(value?: string | null): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function compareNullableDate(
  a: number,
  b: number,
  multiplier: number,
  idA: string,
  idB: string,
): number {
  // Missing values stay at the end in both directions.
  if (a === 0 && b !== 0) return 1;
  if (a !== 0 && b === 0) return -1;
  if (a === 0 && b === 0) return idA.localeCompare(idB);
  const byDate = (a - b) * multiplier;
  return byDate !== 0 ? byDate : idA.localeCompare(idB);
}

function displayName(lead: Lead): string {
  return (
    lead.name?.trim() ||
    `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()
  );
}

function assigneeSortKey(lead: Lead): string {
  const assigned = lead.assignedTo as
    | string
    | { id?: string; firstName?: string; lastName?: string }
    | null
    | undefined;
  if (!assigned) return "";
  if (typeof assigned === "string") return assigned.toLowerCase();
  const name = `${assigned.firstName ?? ""} ${assigned.lastName ?? ""}`.trim();
  return name.toLowerCase() || assigned.id?.toLowerCase() || "";
}

/** Page-local comparator for cached list pages after in-place patches. */
export function compareLeadsForListSort(
  a: Lead,
  b: Lead,
  sortField: string,
  sortOrder: LeadListSortOrder,
): number {
  const multiplier = sortOrder === "asc" ? 1 : -1;

  switch (sortField) {
    case "leadId": {
      const byId =
        normalizeLeadId(a.leadId).localeCompare(
          normalizeLeadId(b.leadId),
          undefined,
          { numeric: true },
        ) * multiplier;
      return byId !== 0 ? byId : a._id.localeCompare(b._id);
    }
    case "name":
    case "firstName": {
      const byName =
        displayName(a).localeCompare(displayName(b), undefined, {
          sensitivity: "base",
        }) * multiplier;
      return byName !== 0 ? byName : a._id.localeCompare(b._id);
    }
    case "country": {
      const byCountry =
        (a.country || "").localeCompare(b.country || "") * multiplier;
      return byCountry !== 0 ? byCountry : a._id.localeCompare(b._id);
    }
    case "status": {
      const byStatus =
        (a.status || "").localeCompare(b.status || "") * multiplier;
      return byStatus !== 0 ? byStatus : a._id.localeCompare(b._id);
    }
    case "source": {
      const bySource =
        (a.source || "").localeCompare(b.source || "") * multiplier;
      return bySource !== 0 ? bySource : a._id.localeCompare(b._id);
    }
    case "assignedTo": {
      const keyA = assigneeSortKey(a);
      const keyB = assigneeSortKey(b);
      if (!keyA && keyB) return 1;
      if (keyA && !keyB) return -1;
      const byAssignee = keyA.localeCompare(keyB) * multiplier;
      return byAssignee !== 0 ? byAssignee : a._id.localeCompare(b._id);
    }
    case "createdAt": {
      const byCreated =
        (dateTimeMs(a.createdAt) - dateTimeMs(b.createdAt)) * multiplier;
      return byCreated !== 0 ? byCreated : a._id.localeCompare(b._id);
    }
    case "updatedAt": {
      const byUpdated =
        (dateTimeMs(a.updatedAt) - dateTimeMs(b.updatedAt)) * multiplier;
      return byUpdated !== 0 ? byUpdated : a._id.localeCompare(b._id);
    }
    case "statusChangedAt":
      return compareNullableDate(
        dateTimeMs(a.statusChangedAt),
        dateTimeMs(b.statusChangedAt),
        multiplier,
        a._id,
        b._id,
      );
    case "lastComment": {
      const commentA = (a.lastComment || "").toLowerCase();
      const commentB = (b.lastComment || "").toLowerCase();
      if (!commentA && commentB) return 1;
      if (commentA && !commentB) return -1;
      if (!commentA && !commentB) return a._id.localeCompare(b._id);
      const byText = commentA.localeCompare(commentB) * multiplier;
      return byText !== 0 ? byText : a._id.localeCompare(b._id);
    }
    case "lastCommentDate":
      return compareNullableDate(
        dateTimeMs(a.lastCommentDate),
        dateTimeMs(b.lastCommentDate),
        multiplier,
        a._id,
        b._id,
      );
    case "lastCallInitiatedAt":
      return compareNullableDate(
        dateTimeMs(a.lastCallInitiatedAt),
        dateTimeMs(b.lastCallInitiatedAt),
        multiplier,
        a._id,
        b._id,
      );
    case "commentCount": {
      const byCount =
        ((a.commentCount ?? 0) - (b.commentCount ?? 0)) * multiplier;
      return byCount !== 0 ? byCount : a._id.localeCompare(b._id);
    }
    case "lastActivityAt":
    default: {
      const byActivity =
        (activityTimeMs(a) - activityTimeMs(b)) * multiplier;
      return byActivity !== 0 ? byActivity : a._id.localeCompare(b._id);
    }
  }
}

/** Re-order one cached page for the active list sort. */
export function sortLeadsForListPage(
  leads: Lead[],
  sortField: string,
  sortOrder: LeadListSortOrder,
): Lead[] {
  if (!isLeadListUiSortField(sortField) || leads.length < 2) {
    return leads;
  }
  return [...leads].sort((a, b) =>
    compareLeadsForListSort(a, b, sortField, sortOrder),
  );
}

/**
 * Map lead rows inside a list-cache payload, then re-sort for the query key.
 */
export function transformLeadsListCacheData(
  old: unknown,
  queryKey: readonly unknown[],
  transformRows: (rows: Lead[]) => Lead[],
): unknown {
  const { sortField, sortOrder } = getListSortFromQueryKey(
    Array.isArray(queryKey) ? queryKey : [],
  );
  const finish = (rows: Lead[]) =>
    sortLeadsForListPage(transformRows(rows), sortField, sortOrder);

  if (Array.isArray(old)) {
    return finish(old as Lead[]);
  }

  if (old && typeof old === "object") {
    const typed = old as {
      leads?: Lead[];
      data?: Lead[];
      assignedLeads?: Lead[];
      [key: string]: unknown;
    };

    if (Array.isArray(typed.leads)) {
      return { ...typed, leads: finish(typed.leads) };
    }
    if (Array.isArray(typed.assignedLeads)) {
      return { ...typed, assignedLeads: finish(typed.assignedLeads) };
    }
    if (Array.isArray(typed.data)) {
      return { ...typed, data: finish(typed.data) };
    }
  }

  return old;
}

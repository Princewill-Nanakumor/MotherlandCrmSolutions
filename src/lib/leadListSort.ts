/** Sort fields the leads list API can apply before skip/limit. */
const LEAD_LIST_SERVER_SORT_FIELDS = [
  "lastActivityAt",
  "createdAt",
  "updatedAt",
  "statusChangedAt",
  "lastCommentDate",
  "lastComment",
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

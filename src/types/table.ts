// src/types/table.ts
export type SortField =
  | "name"
  | "country"
  | "status"
  | "source"
  | "lastActivityAt"
  | "createdAt"
  | "assignedTo"
  | "statusChangedAt";
export type SortOrder = "asc" | "desc";

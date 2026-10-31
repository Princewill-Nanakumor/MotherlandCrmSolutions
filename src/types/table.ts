// src/types/table.ts
export type SortField =
  | "leadId"
  | "name"
  | "country"
  | "status"
  | "source"
  | "lastActivityAt"
  | "createdAt"
  | "assignedTo"
  | "statusChangedAt"
  | "lastComment"
  | "lastCommentDate"
  | "lastCallInitiatedAt"
  | "commentCount";
export type SortOrder = "asc" | "desc";

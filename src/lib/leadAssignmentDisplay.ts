import type { Lead } from "@/types/leads";

type AssigneeUser = {
  id: string;
  firstName?: string;
  lastName?: string;
};

/** Resolve assignee id from ObjectId, string, or embedded `{ _id, firstName, lastName }`. */
export function getLeadAssignedUserId(
  assignedTo: Lead["assignedTo"],
): string | null {
  if (!assignedTo) return null;
  if (typeof assignedTo === "object") {
    const id = assignedTo.id ?? (assignedTo as { _id?: string })._id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }
  return null;
}

/**
 * Whether the lead is assigned to an active user (matches all-leads table logic).
 * When `activeUsers` is omitted, any resolvable assignee id counts as assigned.
 */
export function isLeadAssignedToActiveUser(
  assignedTo: Lead["assignedTo"],
  activeUsers?: AssigneeUser[],
): boolean {
  const userId = getLeadAssignedUserId(assignedTo);
  if (!userId) return false;
  if (!activeUsers || activeUsers.length === 0) return true;
  return activeUsers.some((user) => user.id === userId);
}

/** Display label for panel/header — never shows deleted users when `activeUsers` is provided. */
export function getLeadAssignedDisplayName(
  assignedTo: Lead["assignedTo"],
  activeUsers?: AssigneeUser[],
): string {
  const userId = getLeadAssignedUserId(assignedTo);
  if (!userId) return "Unassigned";

  if (activeUsers && activeUsers.length > 0) {
    const user = activeUsers.find((u) => u.id === userId);
    if (!user) return "Unassigned";
    const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    return name || "Unassigned";
  }

  if (typeof assignedTo === "object" && assignedTo !== null) {
    const obj = assignedTo as { firstName?: string; lastName?: string };
    const name = `${obj.firstName ?? ""} ${obj.lastName ?? ""}`.trim();
    if (name) return name;
  }

  return "Assigned";
}

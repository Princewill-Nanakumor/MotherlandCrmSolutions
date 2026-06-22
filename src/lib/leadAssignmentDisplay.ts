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

/** Title-case each word for display names (e.g. "john" → "John"). */
export function formatPersonName(
  firstName?: string,
  lastName?: string,
): string {
  const capitalize = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };
  return `${capitalize(firstName ?? "")} ${capitalize(lastName ?? "")}`.trim();
}

/** Lead has an assignment record that can be cleared via unassign. */
export function canUnassignLead(assignedTo: Lead["assignedTo"]): boolean {
  return getLeadAssignedUserId(assignedTo) !== null;
}

/** Display label for assign UI — shows Unassigned when user is missing or deleted. */
export function getLeadAssignedDisplayName(
  assignedTo: Lead["assignedTo"],
  activeUsers?: AssigneeUser[],
): string {
  const userId = getLeadAssignedUserId(assignedTo);
  if (!userId) return "Unassigned";

  if (activeUsers && activeUsers.length > 0) {
    const user = activeUsers.find((u) => u.id === userId);
    if (!user) return "Unassigned";
    return formatPersonName(user.firstName, user.lastName) || "Unassigned";
  }

  if (typeof assignedTo === "object" && assignedTo !== null) {
    const obj = assignedTo as { firstName?: string; lastName?: string };
    const name = formatPersonName(obj.firstName, obj.lastName);
    if (name) return name;
  }

  return "Assigned";
}

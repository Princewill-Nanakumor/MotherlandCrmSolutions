export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  USER: "User",
  AGENT: "Agent",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}


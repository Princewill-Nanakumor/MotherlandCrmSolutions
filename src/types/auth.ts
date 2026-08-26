// src/types/auth.ts
export type UserRole = "ADMIN" | "SUBADMIN" | "AGENT";

export interface Permission {
  id: string;
  name: string;
  description: string;
  code: string;
}

export interface RoleWithPermissions {
  id: string;
  name: UserRole;
  permissions: Permission[];
  description: string;
}

export const DEFAULT_PERMISSIONS = {
  MANAGE_USERS: "manage_users",
  MANAGE_LEADS: "manage_leads",
  ASSIGN_LEADS: "assign_leads",
  VIEW_REPORTS: "view_reports",
  MANAGE_SETTINGS: "manage_settings",
  VIEW_DASHBOARD: "view_dashboard",
} as const;

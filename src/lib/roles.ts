/**
 * Tenant RBAC: SUPER_ADMIN is an ADMIN flagged by SUPER_ADMIN_EMAILS.
 * Tenant staff (AGENT / SUBADMIN) always keep `adminId` pointing at the owner.
 *
 * SUBADMIN is not a second tenant owner. Capabilities are opt-in via
 * `permissions` that only an ADMIN may grant.
 */

export const USER_ROLES = {
  ADMIN: "ADMIN",
  SUBADMIN: "SUBADMIN",
  AGENT: "AGENT",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const PERMISSIONS = {
  ASSIGN_LEADS: "ASSIGN_LEADS",
  DELETE_COMMENTS: "DELETE_COMMENTS",
  MANAGE_REMINDERS: "MANAGE_REMINDERS",
  EDIT_LEAD_STATUS: "EDIT_LEAD_STATUS",
} as const;

export type GrantablePermission =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const TEAM_ROLES = [
  {
    value: USER_ROLES.AGENT,
    label: "Agent",
    description: "Works assigned leads only",
  },
  {
    value: USER_ROLES.SUBADMIN,
    label: "Sub Administrator",
    description: "Agent plus extra tasks you enable below",
  },
] as const;

export const SUBADMIN_GRANTABLE_PERMISSIONS: {
  value: GrantablePermission;
  label: string;
  description: string;
}[] = [
  {
    value: PERMISSIONS.ASSIGN_LEADS,
    label: "Assign Leads",
    description: "Open All Leads, filter by agent, and assign or unassign leads",
  },
  {
    value: PERMISSIONS.DELETE_COMMENTS,
    label: "Edit & delete comments",
    description:
      "Edit or delete any comment, and delete timeline activities — not only their own",
  },
  {
    value: PERMISSIONS.MANAGE_REMINDERS,
    label: "Manage reminders",
    description:
      "Edit or delete any reminder on a lead, including completed ones",
  },
  {
    value: PERMISSIONS.EDIT_LEAD_STATUS,
    label: "Edit Lead Status",
    description: "Change status on any lead, including bulk updates",
  },
];

const GRANTABLE_SET = new Set<string>(
  SUBADMIN_GRANTABLE_PERMISSIONS.map((item) => item.value),
);

export type SessionLike = {
  id?: string;
  role?: string;
  permissions?: string[] | null;
  adminId?: string;
};

export function isAdmin(role?: string | null): boolean {
  return role === USER_ROLES.ADMIN;
}

export function isSubAdmin(role?: string | null): boolean {
  return role === USER_ROLES.SUBADMIN;
}

export function isAgent(role?: string | null): boolean {
  return role === USER_ROLES.AGENT;
}

/** AGENT or SUBADMIN — always tenant-scoped via adminId. */
export function isTenantStaff(role?: string | null): boolean {
  return isAgent(role) || isSubAdmin(role);
}

export function isAssignableTeamRole(role?: string | null): boolean {
  return isTenantStaff(role);
}

export function hasPermission(
  user: SessionLike | null | undefined,
  permission: GrantablePermission,
): boolean {
  if (!user?.role) return false;
  if (isAdmin(user.role)) return true;
  if (!isSubAdmin(user.role)) return false;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

export function canAssignLeads(user: SessionLike | null | undefined): boolean {
  return hasPermission(user, PERMISSIONS.ASSIGN_LEADS);
}

/** Users page, create/edit team members — tenant owner only. */
export function canManageUsers(user: SessionLike | null | undefined): boolean {
  return isAdmin(user?.role);
}

/** Edit/delete any comment + delete timeline activities. */
export function canDeleteComments(user: SessionLike | null | undefined): boolean {
  return hasPermission(user, PERMISSIONS.DELETE_COMMENTS);
}

/** Alias — same grant as comment moderation. */
export function canDeleteActivities(
  user: SessionLike | null | undefined,
): boolean {
  return canDeleteComments(user);
}

/** Edit/delete any reminder (including completed). */
export function canManageReminders(
  user: SessionLike | null | undefined,
): boolean {
  return hasPermission(user, PERMISSIONS.MANAGE_REMINDERS);
}

export function canEditAnyLeadStatus(
  user: SessionLike | null | undefined,
): boolean {
  return hasPermission(user, PERMISSIONS.EDIT_LEAD_STATUS);
}

/** Human label for a stored permission code (user details view). */
export function getPermissionDisplayName(permission: string): string {
  const match = SUBADMIN_GRANTABLE_PERMISSIONS.find(
    (item) => item.value === permission,
  );
  return match?.label ?? permission;
}

/** Edit lead contact/details fields — tenant owner only. */
export function canEditLead(user: SessionLike | null | undefined): boolean {
  return isAdmin(user?.role);
}

/** Delete a lead (single or bulk) — tenant owner only. */
export function canDeleteLead(user: SessionLike | null | undefined): boolean {
  return isAdmin(user?.role);
}

/** Create custom statuses — tenant owner only. */
export function canCreateStatus(user: SessionLike | null | undefined): boolean {
  return isAdmin(user?.role);
}

/** Create or import leads — tenant owner only. */
export function canCreateLead(user: SessionLike | null | undefined): boolean {
  return isAdmin(user?.role);
}

/**
 * Change status on a lead the caller can already access.
 * All-leads sub-admins need EDIT_LEAD_STATUS; agents (assigned-only) can
 * still update status on their own leads.
 */
export function canUpdateLeadStatusOnAccessibleLead(
  user: SessionLike | null | undefined,
): boolean {
  if (canEditAnyLeadStatus(user)) return true;
  return isTenantStaff(user?.role) && !canAccessAllLeads(user);
}

const LEAD_CONTACT_UPDATE_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "country",
  "source",
] as const;

/** Drop contact/details (and other) fields the caller is not allowed to set. */
export function stripDisallowedLeadUpdateFields(
  user: SessionLike | null | undefined,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields };
  if (canEditLead(user)) return out;

  for (const key of LEAD_CONTACT_UPDATE_FIELDS) {
    delete out[key];
  }
  if (!canAssignLeads(user)) delete out.assignedTo;
  if (!canUpdateLeadStatusOnAccessibleLead(user)) delete out.status;
  if (!isTenantStaff(user?.role)) delete out.comments;
  return out;
}

/** All Leads page + tenant-wide lead queries. */
export function canAccessAllLeads(user: SessionLike | null | undefined): boolean {
  return canAssignLeads(user);
}

export function canAccessUsersPage(user: SessionLike | null | undefined): boolean {
  return canManageUsers(user);
}

export function usesAgentLeadsPage(
  user: SessionLike | null | undefined,
): boolean {
  return !canAccessAllLeads(user);
}

export function getTenantAdminId(
  user: Pick<SessionLike, "id" | "role" | "adminId">,
): string | null {
  if (isAdmin(user.role) && user.id) return user.id;
  if (isTenantStaff(user.role) && user.adminId) return user.adminId;
  return null;
}

export function sanitizeTeamRole(role?: string | null): "AGENT" | "SUBADMIN" {
  return role === USER_ROLES.SUBADMIN ? USER_ROLES.SUBADMIN : USER_ROLES.AGENT;
}

export function sanitizeSubAdminPermissions(
  role: string,
  permissions?: string[] | null,
): string[] {
  if (role !== USER_ROLES.SUBADMIN) return [];
  return (permissions ?? []).filter((permission) => GRANTABLE_SET.has(permission));
}

export function getRoleDisplayName(role?: string | null): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return "Administrator";
    case USER_ROLES.SUBADMIN:
      return "Sub Administrator";
    case USER_ROLES.AGENT:
      return "Agent";
    default:
      return role || "User";
  }
}

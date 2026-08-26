import { describe, expect, it } from "vitest";
import {
  PERMISSIONS,
  USER_ROLES,
  canAccessAllLeads,
  canAssignLeads,
  canCreateLead,
  canCreateStatus,
  canDeleteActivities,
  canDeleteComments,
  canDeleteLead,
  canEditLead,
  canManageReminders,
  canManageUsers,
  getPermissionDisplayName,
  getTenantAdminId,
  hasPermission,
  isTenantStaff,
  sanitizeSubAdminPermissions,
  sanitizeTeamRole,
  stripDisallowedLeadUpdateFields,
  usesAgentLeadsPage,
} from "./roles";

describe("roles helpers", () => {
  it("treats ADMIN as having every grantable permission", () => {
    const admin = { role: USER_ROLES.ADMIN, permissions: [] };
    expect(hasPermission(admin, PERMISSIONS.ASSIGN_LEADS)).toBe(true);
    expect(canManageUsers(admin)).toBe(true);
    expect(canAccessAllLeads(admin)).toBe(true);
    expect(canDeleteComments(admin)).toBe(true);
    expect(canDeleteActivities(admin)).toBe(true);
    expect(canManageReminders(admin)).toBe(true);
    expect(usesAgentLeadsPage(admin)).toBe(false);
  });

  it("does not grant SUBADMIN capabilities until permissions are set", () => {
    const sub = { role: USER_ROLES.SUBADMIN, permissions: [] };
    expect(canAssignLeads(sub)).toBe(false);
    expect(canManageUsers(sub)).toBe(false);
    expect(canDeleteComments(sub)).toBe(false);
    expect(canManageReminders(sub)).toBe(false);
    expect(usesAgentLeadsPage(sub)).toBe(true);
  });

  it("enables All Leads only with ASSIGN_LEADS", () => {
    const sub = {
      role: USER_ROLES.SUBADMIN,
      permissions: [PERMISSIONS.ASSIGN_LEADS],
    };
    expect(canAccessAllLeads(sub)).toBe(true);
    expect(usesAgentLeadsPage(sub)).toBe(false);
    expect(canManageUsers(sub)).toBe(false);
    expect(canManageUsers({ role: USER_ROLES.ADMIN })).toBe(true);
    expect(canEditLead(sub)).toBe(false);
    expect(canDeleteLead(sub)).toBe(false);
    expect(canCreateStatus(sub)).toBe(false);
    expect(canCreateLead(sub)).toBe(false);
    expect(canEditLead({ role: USER_ROLES.ADMIN })).toBe(true);
  });

  it("grants comment/timeline and reminder moderation via opt-in permissions", () => {
    const commentsOnly = {
      role: USER_ROLES.SUBADMIN,
      permissions: [PERMISSIONS.DELETE_COMMENTS],
    };
    expect(canDeleteComments(commentsOnly)).toBe(true);
    expect(canDeleteActivities(commentsOnly)).toBe(true);
    expect(canManageReminders(commentsOnly)).toBe(false);

    const remindersOnly = {
      role: USER_ROLES.SUBADMIN,
      permissions: [PERMISSIONS.MANAGE_REMINDERS],
    };
    expect(canManageReminders(remindersOnly)).toBe(true);
    expect(canDeleteComments(remindersOnly)).toBe(false);
    expect(getPermissionDisplayName(PERMISSIONS.DELETE_COMMENTS)).toBe(
      "Edit & delete comments",
    );
    expect(getPermissionDisplayName(PERMISSIONS.MANAGE_REMINDERS)).toBe(
      "Manage reminders",
    );
  });

  it("never grants AGENT extra operational permissions", () => {
    const agent = {
      role: USER_ROLES.AGENT,
      permissions: [PERMISSIONS.ASSIGN_LEADS],
    };
    expect(canAssignLeads(agent)).toBe(false);
    expect(canManageUsers(agent)).toBe(false);
    expect(isTenantStaff(agent.role)).toBe(true);
  });

  it("resolves tenant id from ADMIN id or staff adminId", () => {
    expect(getTenantAdminId({ id: "owner", role: "ADMIN" })).toBe("owner");
    expect(
      getTenantAdminId({ id: "sub-1", role: "SUBADMIN", adminId: "owner" }),
    ).toBe("owner");
    expect(getTenantAdminId({ id: "agent-1", role: "AGENT" })).toBeNull();
  });

  it("sanitizes team role and sub-admin permissions", () => {
    expect(sanitizeTeamRole("ADMIN")).toBe("AGENT");
    expect(sanitizeTeamRole("SUBADMIN")).toBe("SUBADMIN");
    expect(
      sanitizeSubAdminPermissions("SUBADMIN", [
        PERMISSIONS.ASSIGN_LEADS,
        PERMISSIONS.MANAGE_REMINDERS,
        "NOT_A_PERMISSION",
      ]),
    ).toEqual([PERMISSIONS.ASSIGN_LEADS, PERMISSIONS.MANAGE_REMINDERS]);
    expect(
      sanitizeSubAdminPermissions("AGENT", [PERMISSIONS.ASSIGN_LEADS]),
    ).toEqual([]);
  });

  it("lets assigning sub-admins change assignedTo only, not contact fields", () => {
    const sub = {
      role: USER_ROLES.SUBADMIN,
      permissions: [PERMISSIONS.ASSIGN_LEADS],
    };
    expect(
      stripDisallowedLeadUpdateFields(sub, {
        firstName: "Ada",
        assignedTo: "agent-1",
        status: "NEW",
      }),
    ).toEqual({ assignedTo: "agent-1" });
  });

  it("lets agents keep status and comments on assigned leads", () => {
    const agent = { role: USER_ROLES.AGENT, permissions: [] };
    expect(
      stripDisallowedLeadUpdateFields(agent, {
        firstName: "Ada",
        status: "CONTACTED",
        comments: "Called",
        assignedTo: "someone",
      }),
    ).toEqual({ status: "CONTACTED", comments: "Called" });
  });
});

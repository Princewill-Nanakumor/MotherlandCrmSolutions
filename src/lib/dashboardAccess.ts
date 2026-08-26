import {
  isAgentLeadsDashboardPath,
  isAllLeadsDashboardPath,
  isOwnerOnlyDashboardPath,
  isUsersDashboardPath,
} from "./dashboardAdminOnlyPaths";
import {
  canAccessAllLeads,
  canAccessUsersPage,
  usesAgentLeadsPage,
} from "./roles";

function staffHome(role: string | undefined, permissions: string[] = []): string {
  return usesAgentLeadsPage({ role, permissions })
    ? "/dashboard/leads"
    : "/dashboard/all-leads";
}

/**
 * Role-based dashboard redirects (ADMIN / SUBADMIN / AGENT route matrix).
 * Returns a path to redirect to, or null when access is allowed.
 */
export function getDashboardRoleRedirect(
  path: string,
  role: string | undefined,
  permissions: string[] = [],
): string | null {
  const user = { role, permissions };

  if (isOwnerOnlyDashboardPath(path) && role !== "ADMIN") {
    return staffHome(role, permissions);
  }

  if (isAllLeadsDashboardPath(path) && !canAccessAllLeads(user)) {
    return "/dashboard/leads";
  }

  if (isUsersDashboardPath(path) && !canAccessUsersPage(user)) {
    return staffHome(role, permissions);
  }

  if (isAgentLeadsDashboardPath(path) && canAccessAllLeads(user)) {
    return "/dashboard/all-leads";
  }

  return null;
}

export function canAccessAdminManagement(
  email: string | undefined,
  allowedEmails: string[],
): boolean {
  if (!email) return false;
  if (allowedEmails.length === 0) return true;
  return allowedEmails.includes(email);
}

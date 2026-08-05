import { isAdminOnlyDashboardPath } from "./dashboardAdminOnlyPaths";

/**
 * Role-based dashboard redirects (ADMIN ↔ AGENT route matrix).
 * Returns a path to redirect to, or null when access is allowed.
 */
export function getDashboardRoleRedirect(
  path: string,
  role: string | undefined,
): string | null {
  if (role !== "ADMIN" && isAdminOnlyDashboardPath(path)) {
    return "/dashboard/leads";
  }
  if (
    role === "ADMIN" &&
    (path === "/dashboard/leads" || path.startsWith("/dashboard/leads/"))
  ) {
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

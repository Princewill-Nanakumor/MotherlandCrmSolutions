/**
 * Dashboard route classes for RBAC.
 * Keep in sync with {@link Sidebar} items + footer links.
 */

const OWNER_ONLY_PREFIXES = [
  "/dashboard/adsManager",
  "/dashboard/billing",
  "/dashboard/subscription",
  "/dashboard/help",
  "/dashboard/import",
  "/dashboard/admin-management",
  "/dashboard/notifications",
  "/dashboard/payment-details",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isOwnerOnlyDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return OWNER_ONLY_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAllLeadsDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return matchesPrefix(pathname, "/dashboard/all-leads");
}

export function isUsersDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return matchesPrefix(pathname, "/dashboard/users");
}

export function isAgentLeadsDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return matchesPrefix(pathname, "/dashboard/leads");
}

/**
 * Routes under /dashboard that a plain AGENT may not open.
 * Sub-admins may still open All Leads when ASSIGN_LEADS is granted.
 * Users, import, billing, subscription, and help stay owner-only.
 */
export function isAdminOnlyDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    isOwnerOnlyDashboardPath(pathname) ||
    isAllLeadsDashboardPath(pathname) ||
    isUsersDashboardPath(pathname)
  );
}

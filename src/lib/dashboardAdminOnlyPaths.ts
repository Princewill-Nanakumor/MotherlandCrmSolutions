/**
 * Routes under /dashboard that only ADMIN may open (direct URL or nav).
 * Keep in sync with {@link Sidebar} `adminOnly` items + admin-only footer links.
 */
const ADMIN_ONLY_PREFIXES = [
  "/dashboard/adsManager",
  "/dashboard/billing",
  "/dashboard/subscription",
  "/dashboard/help",
  "/dashboard/all-leads",
  "/dashboard/users",
  "/dashboard/import",
  "/dashboard/admin-management",
  "/dashboard/notifications",
  "/dashboard/payment-details",
] as const;

export function isAdminOnlyDashboardPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

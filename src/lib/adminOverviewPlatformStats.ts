import type { AdminStats, PlatformStats } from "@/types/adminTypes";

/** Derive dashboard totals from the admin list + normalized SUPER_ADMIN_EMAILS. */
export function buildOverviewPlatformStats(
  admins: AdminStats[],
  superAdminEmailsNormalized: string[],
): PlatformStats {
  const set = new Set(superAdminEmailsNormalized);
  const totalAdmins = admins.length;
  const totalSuperAdmins = admins.filter((a) =>
    set.has((a.email || "").trim().toLowerCase()),
  ).length;
  const tenantOnlyAdmins = Math.max(0, totalAdmins - totalSuperAdmins);

  return {
    totalAdmins,
    totalSuperAdmins,
    tenantOnlyAdmins,
    totalAgents: admins.reduce((s, a) => s + a.agentCount, 0),
    totalLeads: admins.reduce((s, a) => s + a.leadCount, 0),
    activeSubscriptions: admins.filter((admin) => {
      const sub = admin.subscription;
      return (
        !!sub &&
        (sub.status === "ACTIVE" ||
          sub.status === "active" ||
          sub.status === "Active")
      );
    }).length,
    totalBalance: admins.reduce((s, a) => s + a.balance, 0),
  };
}

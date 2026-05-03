// src/components/adminManagement/AdminStats.tsx
"use client";

import {
  Users,
  UserCheck,
  Activity,
  TrendingUp,
  DollarSign,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformStats } from "@/types/adminTypes";

interface AdminStatsProps {
  platformStats: PlatformStats | null;
}

export default function AdminStats({ platformStats }: AdminStatsProps) {
  const formatBalance = (balance?: number) => {
    if (!balance) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(balance);
  };

  if (!platformStats) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        {[...Array(5)].map((_, index) => (
          <Card
            key={index}
            className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
                Loading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                -
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalSuperAdmins = platformStats.totalSuperAdmins ?? 0;
  const tenantOnlyAdmins = platformStats.tenantOnlyAdmins ?? 0;
  const totalAdmins = platformStats.totalAdmins;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
      <Card className="@container min-w-0 backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl md:col-span-2 xl:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Administrators
          </CardTitle>
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Total accounts
            </p>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalAdmins.toLocaleString()}
            </div>
            <p className="mt-1 text-pretty text-xs leading-snug text-gray-500 dark:text-gray-400">
              All tenant admins; total includes platform super admins.
            </p>
          </div>
          <div className="grid grid-cols-1 items-start gap-y-4 border-t border-gray-200 pt-3 @sm:grid-cols-2 @sm:gap-x-4 @sm:gap-y-3 dark:border-gray-600">
            <div className="flex min-w-0 items-start gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Super admins
                </p>
                <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {totalSuperAdmins.toLocaleString()}
                </p>
                <p className="wrap-break-word text-[11px] leading-snug text-gray-500 dark:text-gray-500">
                  In SUPER_ADMIN_EMAILS
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <span
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tenant-only
                </p>
                <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
                  {tenantOnlyAdmins.toLocaleString()}
                </p>
                <p className="wrap-break-word text-pretty text-[11px] leading-snug text-gray-500 dark:text-gray-500">
                  Admins not in the super list
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Total Agents
          </CardTitle>
          <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {platformStats.totalAgents.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Created team members
          </p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Total Leads
          </CardTitle>
          <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {platformStats.totalLeads.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Calculated from all admins
          </p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Active Subscriptions
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {platformStats.activeSubscriptions.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Admins with active plans
          </p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Total Balance
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatBalance(platformStats.totalBalance)}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Combined balance
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

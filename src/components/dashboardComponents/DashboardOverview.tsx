// src/components/dashboardComponents/DashboardOverview.tsx
"use client";

import React from "react";
import { BarChart3, Users, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useUsersData, useLeadsStats } from "@/hooks/useDashboardData";
import LeadStatusStats from "@/components/dashboardComponents/LeadStatusStats";
import { canAccessAllLeads } from "@/lib/roles";

// Loading skeleton for stat cards
const StatCardSkeleton = () => (
  <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex flex-col justify-center min-h-15">
        <div className="w-24 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700"></div>
        <div className="w-16 h-6 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
      <div className="w-12 h-12 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
    </div>
  </div>
);

interface DashboardOverviewProps {
  className?: string;
}

export default function DashboardOverview({
  className = "",
}: DashboardOverviewProps) {
  const { data: session, status } = useSession();

  // Use React Query for data fetching
  const { users, isLoading: isLoadingUsers } = useUsersData();
  const isAdmin = canAccessAllLeads(session?.user);
  const { stats, isLoading: isLoadingStats, hasData } = useLeadsStats(isAdmin);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-700 dark:text-gray-300">Loading dashboard...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Active Users = agents managed by admin (exclude the admin themselves)
  const activeUsers = users.filter(
    (user) => user.status === "ACTIVE" && user.id !== session?.user?.id,
  );

  // Show skeleton if loading OR if we haven't loaded data yet (prevents showing 0)
  // This ensures skeleton shows during initial load before API responds
  const shouldShowStatsSkeleton = isLoadingStats || !hasData;

  return (
    <div
      className={`w-full p-6 space-y-8 bg-background dark:bg-gray-800 rounded-md border ${className}`}
    >
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900! dark:text-white!">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Welcome back, {session?.user?.firstName || "User"}
          </p>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      {isAdmin ? (
        // Admin Dashboard - All 4 cards in grid
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Leads Card */}
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col justify-center min-h-15">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Leads
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg dark:bg-blue-900">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          )}

          {/* Total Active Users Card */}
          {isLoadingUsers ? (
            <StatCardSkeleton />
          ) : (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col justify-center min-h-15">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {activeUsers.length.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg dark:bg-yellow-900">
                  <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
          )}

          {/* Assigned Leads Card */}
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col justify-center min-h-15">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Assigned Leads
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.assigned.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg dark:bg-green-900">
                  <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          )}

          {/* Unassigned Leads Card */}
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col justify-center min-h-15">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Unassigned Leads
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.unassigned.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg dark:bg-orange-900">
                  <Search className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // User/Agent Dashboard - Only My Leads card (no grid, single card)
        <div className="max-w-sm">
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col justify-center min-h-15">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    My Assigned Leads
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.myLeads.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg dark:bg-blue-900">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Per-status lead counts + distribution chart */}
      <LeadStatusStats isAdmin={isAdmin} />
    </div>
  );
}

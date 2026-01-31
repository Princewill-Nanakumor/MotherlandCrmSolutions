// src/components/dashboardComponents/DashboardOverview.tsx
"use client";

import React from "react";
import { BarChart3, Users, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useUsersData, useLeadsStats } from "@/hooks/useDashboardData";

// Loading skeleton for stat cards
const StatCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="min-h-[60px] flex flex-col justify-center">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      <div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
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
  const isAdmin = session?.user?.role === "ADMIN";
  const { stats, isLoading: isLoadingStats, hasData } = useLeadsStats(isAdmin);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
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
      className={`container mx-auto p-8 space-y-8 bg-background dark:bg-gray-800 rounded-md border ${className}`}
    >
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold !text-gray-900 dark:!text-white">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Welcome back, {session?.user?.firstName || "User"}
          </p>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      {isAdmin ? (
        // Admin Dashboard - All 4 cards in grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Leads Card */}
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="min-h-[60px] flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Leads
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          )}

          {/* Total Active Users Card */}
          {isLoadingUsers ? (
            <StatCardSkeleton />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="min-h-[60px] flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {activeUsers.length.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>
          )}

          {/* Assigned Leads Card */}
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="min-h-[60px] flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Assigned Leads
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.assigned.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          )}

          {/* Unassigned Leads Card */}
          {shouldShowStatsSkeleton ? (
            <StatCardSkeleton />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="min-h-[60px] flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Unassigned Leads
                  </p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.unassigned.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                  <Search className="h-6 w-6 text-orange-600 dark:text-orange-400" />
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="min-h-[60px] flex flex-col justify-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    My Assigned Leads
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.myLeads.toLocaleString()}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

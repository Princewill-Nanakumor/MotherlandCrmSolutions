// src/components/leads/UserLeadsHeader.tsx
"use client";

import { Users, Globe } from "lucide-react";

interface UserLeadsHeaderProps {
  shouldShowLoading: boolean;
  counts: {
    total: number;
    filtered: number;
    countries: number;
  };
}

export const UserLeadsHeader: React.FC<UserLeadsHeaderProps> = ({
  shouldShowLoading,
  counts,
}) => {
  if (shouldShowLoading) {
    return (
      <div className="px-4 pt-6 bg-white rounded-t-xl sm:px-8 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 w-48 h-8 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="w-64 h-4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
          </div>
          <div className="flex flex-wrap gap-2 items-center sm:gap-3">
            <div className="w-24 h-6 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700"></div>
            <div className="w-20 h-6 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700"></div>
            <div className="w-28 h-6 bg-gray-200 rounded-full animate-pulse dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 bg-white rounded-t-xl sm:px-8 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-gray-900! wrap-break-word sm:gap-3 sm:text-2xl dark:text-white!">
            <Users className="h-6 w-6 shrink-0 text-blue-600! dark:text-blue-400!" />
            My Leads
          </h1>
          <p className="text-sm text-gray-600! dark:text-gray-400!">
            View and manage your assigned leads
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap gap-2 items-center sm:gap-3 shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800! dark:bg-gray-700 dark:text-white!">
            {counts.total.toLocaleString()} Total Leads
          </span>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700! dark:border-gray-600 dark:text-white!">
            {counts.filtered.toLocaleString()} Filtered
          </span>

          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800! dark:bg-blue-900 dark:text-blue-200!">
            <Globe className="h-3 w-3 mr-1 text-blue-800! dark:text-blue-200!" />
            {counts.countries} Countries
          </span>
        </div>
      </div>
    </div>
  );
};

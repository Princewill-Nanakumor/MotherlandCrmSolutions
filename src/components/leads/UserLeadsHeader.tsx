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
      <div className="px-8 pt-6 bg-white dark:bg-gray-800 dark:border-gray-700 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="w-28 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pt-6 bg-white dark:bg-gray-800 dark:border-gray-700 rounded-t-xl">
      <div className="flex items-center justify-between">
        <div>
        <h1 className="text-2xl font-bold text-gray-900! dark:text-white! flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600! dark:text-blue-400!" />
          My Leads
        </h1>
        <p className="text-sm text-gray-600! dark:text-gray-400!">
          View and manage your assigned leads
        </p>
      </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3">
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

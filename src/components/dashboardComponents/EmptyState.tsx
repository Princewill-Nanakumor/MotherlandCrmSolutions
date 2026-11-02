// src/components/dashboardComponents/EmptyState.tsx
import React from "react";
import { RefreshCw, Users, Globe } from "lucide-react";
import { User } from "@/types/user.types";
import {
  describeLeadEmptyFilters,
  type LeadFilterMode,
} from "@/lib/leadEmptyFilterDescription";

interface EmptyStateProps {
  filterByUser: string | string[];
  filterByCountry: string | string[];
  filterByStatus: string | string[];
  filterBySource: string | string[];
  userFilterMode?: LeadFilterMode;
  countryFilterMode?: LeadFilterMode;
  statusFilterMode?: LeadFilterMode;
  sourceFilterMode?: LeadFilterMode;
  users: User[];
  /** When set, Clear Filters uses this instead of full reload so state/URL stay in sync */
  onClearFilters?: () => void;
  searchQuery?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  filterByUser,
  filterByCountry,
  filterByStatus,
  filterBySource,
  userFilterMode = "include",
  countryFilterMode = "include",
  statusFilterMode = "include",
  sourceFilterMode = "include",
  users,
  onClearFilters,
  searchQuery = "",
}) => {
  const filterParts = describeLeadEmptyFilters({
    filterByUser,
    filterByCountry,
    filterByStatus,
    filterBySource,
    userFilterMode,
    countryFilterMode,
    statusFilterMode,
    sourceFilterMode,
    users,
    searchQuery,
  });
  const hasAnyFilters = filterParts.length > 0;
  const filterDescription = hasAnyFilters
    ? filterParts.join(" and ")
    : "leads in the system";

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-col justify-center items-center px-6 py-12">
      <div className="text-center">
        <div className="flex justify-center items-center mx-auto mb-4 w-12 h-12 bg-gray-100 rounded-full dark:bg-gray-800">
          <Users className="w-6 h-6 text-gray-400" />
        </div>

        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          No {filterDescription} found
        </h3>

        <p className="mb-6 max-w-md text-sm text-gray-500 dark:text-gray-400">
          {!hasAnyFilters
            ? "There are currently no leads in the system. New leads will appear here once they are added."
            : `No ${filterDescription} match your current filters. Try adjusting your filters or check back later.`}
        </p>

        <div className="flex flex-col gap-3 justify-center sm:flex-row">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md border border-transparent transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--brand-focus)"
          >
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh
          </button>

          {hasAnyFilters && (
            <button
              onClick={() => {
                if (onClearFilters) {
                  onClearFilters();
                } else {
                  window.location.href = window.location.pathname;
                }
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-md border border-gray-300 transition-colors dark:border-gray-600 dark:text-gray-300 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-(--brand-focus)"
            >
              <Globe className="mr-2 w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;

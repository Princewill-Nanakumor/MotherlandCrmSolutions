// src/app/components/dashboardComponents/EmptyState.tsx
import React from "react";
import { RefreshCw, Users, Globe } from "lucide-react";
import { User } from "@/types/user.types";

interface EmptyStateProps {
  filterByUser: string | string[]; // Support both for backward compat
  filterByCountry: string | string[];
  filterByStatus: string | string[];
  filterBySource: string | string[];
  users: User[];
  /** When set, Clear Filters uses this instead of full reload so state/URL stay in sync (fixes production) */
  onClearFilters?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  filterByUser,
  filterByCountry,
  filterByStatus,
  filterBySource,
  users,
  onClearFilters,
}) => {
  // Helper to normalize filter values to arrays
  const normalizeFilter = (filter: string | string[]): string[] => {
    if (Array.isArray(filter)) return filter;
    return filter === "all" || !filter ? [] : [filter];
  };

  const getFilterDescription = () => {
    const filters = [];

    const userFilter = normalizeFilter(filterByUser);
    if (userFilter.length > 0) {
      if (userFilter.includes("unassigned")) {
        filters.push("unassigned leads");
      }
      const userIds = userFilter.filter((id) => id !== "unassigned");
      if (userIds.length > 0) {
        const userNames = userIds
          .map((id) => {
            const user = users.find((u) => u.id === id);
            return user ? `${user.firstName} ${user.lastName}` : null;
          })
          .filter(Boolean);
        if (userNames.length > 0) {
          if (userNames.length === 1) {
            filters.push(`leads assigned to ${userNames[0]}`);
          } else {
            filters.push(`leads assigned to ${userNames.slice(0, 2).join(", ")}${userNames.length > 2 ? ` and ${userNames.length - 2} more` : ""}`);
          }
        }
      }
    }

    const countryFilter = normalizeFilter(filterByCountry);
    if (countryFilter.length > 0) {
      if (countryFilter.length === 1) {
        filters.push(`leads from ${countryFilter[0]}`);
      } else {
        filters.push(`leads from ${countryFilter.slice(0, 2).join(", ")}${countryFilter.length > 2 ? ` and ${countryFilter.length - 2} more` : ""}`);
      }
    }

    const statusFilter = normalizeFilter(filterByStatus);
    if (statusFilter.length > 0) {
      if (statusFilter.length === 1) {
        filters.push(`leads with status "${statusFilter[0]}"`);
      } else {
        filters.push(`leads with ${statusFilter.length} selected statuses`);
      }
    }

    const sourceFilter = normalizeFilter(filterBySource);
    if (sourceFilter.length > 0) {
      if (sourceFilter.length === 1) {
        filters.push(`leads from source "${sourceFilter[0]}"`);
      } else {
        filters.push(`leads from ${sourceFilter.slice(0, 2).join(", ")}${sourceFilter.length > 2 ? ` and ${sourceFilter.length - 2} more` : ""}`);
      }
    }

    if (filters.length === 0) {
      return "leads in the system";
    }

    return filters.join(" and ");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const userFilter = normalizeFilter(filterByUser);
  const countryFilter = normalizeFilter(filterByCountry);
  const statusFilter = normalizeFilter(filterByStatus);
  const sourceFilter = normalizeFilter(filterBySource);

  const hasAnyFilters =
    userFilter.length > 0 ||
    countryFilter.length > 0 ||
    statusFilter.length > 0 ||
    sourceFilter.length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <Users className="h-6 w-6 text-gray-400" />
        </div>

        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No {getFilterDescription()} found
        </h3>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
          {!hasAnyFilters
            ? "There are currently no leads in the system. New leads will appear here once they are added."
            : `No ${getFilterDescription()} match your current filters. Try adjusting your filters or check back later.`}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
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
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <Globe className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmptyState;

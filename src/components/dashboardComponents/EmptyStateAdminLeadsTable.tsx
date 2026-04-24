// src/components/dashboardComponents/EmptyStateAdminLeadsTable.tsx
import React from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  // Add other fields if needed
}

interface EmptyStateAdminLeadsTableProps {
  searchQuery?: string;
  filterByUser?: string | string[];
  filterByCountry?: string | string[];
  filterByStatus?: string | string[];
  filterBySource?: string | string[];
  hasFilters?: boolean;
  users?: User[];
}

export const EmptyStateAdminLeadsTable: React.FC<
  EmptyStateAdminLeadsTableProps
> = ({
  searchQuery = "",
  filterByUser = "all",
  filterByCountry = "all",
  filterByStatus = "all",
  filterBySource = "all",
  hasFilters = false,
  users = [],
}) => {
  const getEmptyStateContent = () => {
    // Search-specific empty state
    if (searchQuery) {
      return {
        icon: (
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        ),
        title: "No leads found",
        description: `No leads match your search for "${searchQuery}". Try adjusting your search terms or clearing the search.`,
        action: "Clear search or try different keywords",
      };
    }

    // Filter-specific empty state
    if (hasFilters) {
      // Helper to normalize filter values to arrays
      const normalizeFilter = (filter: string | string[] | undefined): string[] => {
        if (!filter) return [];
        if (Array.isArray(filter)) return filter;
        return filter === "all" ? [] : [filter];
      };

      const filters: string[] = [];
      const userFilter = normalizeFilter(filterByUser);
      if (userFilter.length > 0) {
        if (userFilter.includes("unassigned")) {
          filters.push("unassigned leads");
        }
        const userIds = userFilter.filter((id) => id !== "unassigned");
        if (userIds.length > 0) {
          const userNames = userIds
            .map((id) => {
              const user = users?.find((u) => u.id === id);
              return user ? `${user.firstName} ${user.lastName}` : null;
            })
            .filter(Boolean);
          if (userNames.length > 0) {
            filters.push(`leads assigned to ${userNames.join(", ")}`);
          }
        }
      }
      const countryFilter = normalizeFilter(filterByCountry);
      if (countryFilter.length > 0) {
        filters.push(`leads from ${countryFilter.join(", ")}`);
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
        filters.push(`leads from source "${sourceFilter.join(", ")}"`);
      }

      return {
        icon: (
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        ),
        title: "No leads found",
        description: `No leads match your current filters: ${filters.join(
          ", "
        )}. Try adjusting your filters or clearing them.`,
        action: "Clear filters or adjust search criteria",
      };
    }

    // General empty state (no leads at all)
    return {
      icon: (
        <svg
          className="mx-auto h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      ),
      title: "No leads available",
      description:
        "Get started by importing your first leads to begin managing them.",
      action: "Import leads to get started",
    };
  };

  const { icon, title, description, action } = getEmptyStateContent();

  return (
    <tbody>
      <tr>
        <td colSpan={100} className="px-4 py-16">
          <div className="flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md mx-auto">
              <div className="text-gray-400">{icon}</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {action}
              </p>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  );
};

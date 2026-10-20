// src/components/dashboardComponents/LeadHeader.tsx
"use client";

import { Globe } from "lucide-react";
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";
import { DASHBOARD_PAGE_INSET_HEADER_CLASS } from "@/lib/dashboardPageShell";

interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  status: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadsHeaderProps {
  shouldShowLoading: boolean;
  counts: {
    total: number;
    filtered: number;
    countries: number;
  };
  filteredLeads?: Lead[]; // Add this prop to receive filtered leads
  allLeads?: Lead[]; // Add this prop to receive all leads
}

// Loading skeleton components
const CountSkeleton = () => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
    <div className="w-12 h-3 bg-gray-300 rounded animate-pulse dark:bg-gray-600"></div>
  </div>
);

const FilteredSkeleton = () => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300">
    <div className="w-16 h-3 bg-gray-300 rounded animate-pulse dark:bg-gray-600"></div>
  </div>
);

const CountriesSkeleton = () => (
  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
    <Globe className="mr-1 w-3 h-3" />
    <div className="w-8 h-3 bg-blue-300 rounded animate-pulse dark:bg-blue-700"></div>
  </div>
);

export const LeadsHeader: React.FC<LeadsHeaderProps> = ({
  shouldShowLoading,
  counts,
  filteredLeads = [],
  allLeads = [],
}) => {
  // Calculate counts based on the provided data
  const calculatedCounts = {
    total: allLeads.length,
    filtered: filteredLeads.length,
    countries: [...new Set(allLeads.map((lead: Lead) => lead.country))].length,
  };

  // Use calculated counts if we have data, otherwise fall back to props
  const displayCounts = allLeads.length > 0 ? calculatedCounts : counts;
  const isLoading = shouldShowLoading;

  return (
    <div className={DASHBOARD_PAGE_INSET_HEADER_CLASS}>
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Leads Management</h1>
          <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
            Manage and track all your leads in one centralized dashboard
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center sm:gap-3 shrink-0">
          {isLoading ? (
            <CountSkeleton />
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {displayCounts.total.toLocaleString()} Total Leads
            </span>
          )}

          {isLoading ? (
            <FilteredSkeleton />
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-700! dark:border-gray-600 dark:text-white!">
              {displayCounts.filtered.toLocaleString()} Filtered
            </span>
          )}

          {isLoading ? (
            <CountriesSkeleton />
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <Globe className="mr-1 w-3 h-3" />
              {displayCounts.countries} Countries
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

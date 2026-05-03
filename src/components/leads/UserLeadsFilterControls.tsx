// src/components/leads/UserLeadsFilterControls.tsx
"use client";

import React from "react";
import { CountsData } from "@/types/pagination.types";

import { StatusFilter } from "../dashboardComponents/leadsFilters/StatusFilter";
import { CountryFilter } from "../dashboardComponents/leadsFilters/CountryFilter";
import { SourceFilter } from "../dashboardComponents/leadsFilters/SourceFilter";

interface UserLeadsFilterControlsProps {
  shouldShowLoading: boolean;
  filterByCountry: string | string[];
  filterByStatus: string | string[];
  filterBySource: string | string[];
  onCountryFilterChange: (countries: string[]) => void;
  onStatusFilterChange: (statuses: string[]) => void;
  onSourceFilterChange: (sources: string[]) => void;
  availableCountries: string[];
  availableStatuses: string[]; // Keep this for backward compatibility but won't use it
  availableSources: string[];
  counts: CountsData;
}

const FilterSkeleton = () => (
  <div className="flex items-center gap-3">
    <div className="h-10 bg-gray-200 rounded-md w-45 dark:bg-gray-700 animate-pulse" />
    <div className="h-10 bg-gray-200 rounded-md w-45 dark:bg-gray-700 animate-pulse" />
  </div>
);

export const UserLeadsFilterControls: React.FC<
  UserLeadsFilterControlsProps
> = ({
  shouldShowLoading,
  filterByCountry,
  filterByStatus,
  filterBySource,
  onCountryFilterChange,
  onStatusFilterChange,
  onSourceFilterChange,
  availableCountries,
  availableSources,
}) => {
  // Normalize filters to arrays
  const normalizeFilter = (filter: string | string[]): string[] => {
    if (Array.isArray(filter)) return filter;
    return filter === "all" || !filter ? [] : [filter];
  };

  const countryFilter = normalizeFilter(filterByCountry);
  const statusFilter = normalizeFilter(filterByStatus);
  const sourceFilter = normalizeFilter(filterBySource);

  if (shouldShowLoading) {
    return (
      <div className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 pb-5 mt-8 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between px-3 py-4 sm:px-4 border rounded-xl">
          <FilterSkeleton />
          <div className="w-48 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 pb-5 mt-8 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-3 py-4 sm:px-4 border rounded-xl">
        <div className="flex items-center gap-3">
          {/* Country Filter */}
          <CountryFilter
            value={countryFilter}
            onChange={onCountryFilterChange}
            disabled={shouldShowLoading}
            isLoading={false}
            availableCountries={availableCountries}
          />

          {/* Status Filter - Use the same component as ADMIN */}
          <StatusFilter
            value={statusFilter}
            onChange={onStatusFilterChange}
            disabled={shouldShowLoading}
            isLoading={false}
          />

          {/* Source Filter */}
          <SourceFilter
            value={sourceFilter}
            onChange={onSourceFilterChange}
            disabled={shouldShowLoading}
            isLoading={false}
            availableSources={availableSources}
          />
        </div>
      </div>
    </div>
  );
};

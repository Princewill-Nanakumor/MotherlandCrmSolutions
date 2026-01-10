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
    <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
    <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <FilterSkeleton />
          <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ">
      <div className="flex items-center justify-between">
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

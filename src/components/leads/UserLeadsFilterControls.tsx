// src/components/leads/UserLeadsFilterControls.tsx
"use client";

import React from "react";
import { CountsData } from "@/types/pagination.types";

import { StatusFilter } from "../dashboardComponents/leadsFilters/StatusFilter";
import { CountryFilter } from "../dashboardComponents/leadsFilters/CountryFilter";
import { SourceFilter } from "../dashboardComponents/leadsFilters/SourceFilter";

interface UserLeadsFilterControlsProps {
  filterByCountry: string | string[];
  filterByStatus: string | string[];
  filterBySource: string | string[];
  onCountryFilterChange: (countries: string[]) => void;
  onStatusFilterChange: (statuses: string[]) => void;
  onSourceFilterChange: (sources: string[]) => void;
  countryFilterMode: "include" | "exclude";
  statusFilterMode: "include" | "exclude";
  sourceFilterMode: "include" | "exclude";
  onCountryFilterModeChange: (mode: "include" | "exclude") => void;
  onStatusFilterModeChange: (mode: "include" | "exclude") => void;
  onSourceFilterModeChange: (mode: "include" | "exclude") => void;
  availableCountries: string[];
  availableStatuses: string[];
  availableSources: string[];
  counts: CountsData;
}

export const UserLeadsFilterControls: React.FC<
  UserLeadsFilterControlsProps
> = ({
  filterByCountry,
  filterByStatus,
  filterBySource,
  onCountryFilterChange,
  onStatusFilterChange,
  onSourceFilterChange,
  countryFilterMode,
  statusFilterMode,
  sourceFilterMode,
  onCountryFilterModeChange,
  onStatusFilterModeChange,
  onSourceFilterModeChange,
  availableCountries,
  availableSources,
}) => {
  const normalizeFilter = (filter: string | string[]): string[] => {
    if (Array.isArray(filter)) return filter;
    return filter === "all" || !filter ? [] : [filter];
  };

  const countryFilter = normalizeFilter(filterByCountry);
  const statusFilter = normalizeFilter(filterByStatus);
  const sourceFilter = normalizeFilter(filterBySource);

  return (
    <div className="sticky top-0 z-10 px-4 pb-5 mt-10 bg-white sm:px-6 lg:px-8 dark:bg-gray-800">
      <div className="flex flex-col gap-3 px-3 py-4 rounded-xl border min-w-0 md:flex-row md:items-center md:justify-end sm:px-4">
        <div className="flex flex-col gap-2 items-stretch w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 md:w-auto">
          <StatusFilter
            value={statusFilter}
            onChange={onStatusFilterChange}
            disabled={false}
            isLoading={false}
            mode={statusFilterMode}
            onModeChange={onStatusFilterModeChange}
          />

          <SourceFilter
            value={sourceFilter}
            onChange={onSourceFilterChange}
            disabled={false}
            isLoading={false}
            mode={sourceFilterMode}
            onModeChange={onSourceFilterModeChange}
            availableSources={availableSources}
          />

          <CountryFilter
            value={countryFilter}
            onChange={onCountryFilterChange}
            disabled={false}
            isLoading={false}
            mode={countryFilterMode}
            onModeChange={onCountryFilterModeChange}
            availableCountries={availableCountries}
          />
        </div>
      </div>
    </div>
  );
};

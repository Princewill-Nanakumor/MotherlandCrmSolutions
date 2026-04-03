// src/components/dashboardComponents/LeadsFilter.tsx
"use client";

import { useState } from "react";
import { BulkActions } from "@/components/dashboardComponents/BulkActions";
import { UserFilter } from "./UserFilter";
import { StatusFilter } from "./StatusFilter";
import { CountryFilter } from "./CountryFilter";
import { SourceFilter } from "./SourceFilter";
import { AddStatusButton } from "./AddStatusButton";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddLeadDialog } from "@/components/dashboardComponents/AddLeadDialog";

// ✅ Enhanced Filter Skeleton Component
const FilterSkeleton = () => (
  <div
    className="flex items-center gap-3"
    role="status"
    aria-label="Loading filters"
  >
    {/* Add Lead Button Skeleton */}
    <div className="w-[120px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

    {/* Add Status Button Skeleton */}
    <div className="w-[120px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

    {/* User Filter Skeleton */}
    <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

    {/* Status Filter Skeleton */}
    <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

    {/* Source Filter Skeleton */}
    <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />

    {/* Country Filter Skeleton */}
    <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
  </div>
);

const ErrorBoundary = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) return <>{fallback}</>;

  try {
    return <>{children}</>;
  } catch {
    setHasError(true);
    return <>{fallback}</>;
  }
};

interface LeadsFilterControlsProps {
  selectedLeads: Lead[];
  hasAssignedLeads: boolean;
  assignedLeadsCount: number;
  isUpdating: boolean;
  onAssign: () => void;
  onUnassign: () => void;
  onStatusChange?: (statusId: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  filterByCountry: string[]; // Changed to array
  onCountryFilterChange: (countries: string[]) => void; // Changed to array
  countryFilterMode?: "include" | "exclude"; // Filter mode
  onCountryFilterModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
  filterByStatus: string[]; // Changed to array
  onStatusFilterChange: (statuses: string[]) => void; // Changed to array
  statusFilterMode?: "include" | "exclude"; // Filter mode
  onStatusFilterModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
  filterBySource: string[]; // Changed to array
  onSourceFilterChange: (sources: string[]) => void; // Changed to array
  sourceFilterMode?: "include" | "exclude"; // Filter mode
  onSourceFilterModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
  isLoading: boolean;
  filterByUser: string[]; // Changed to array
  onFilterChange: (values: string[]) => void; // Changed to array
  users: User[];
  statuses?: Array<{ id: string; name: string; color?: string; _id?: string }>;
  isLoadingStatuses?: boolean;
  onAddLead?: () => void;
}

export const LeadsFilterControls: React.FC<LeadsFilterControlsProps> = ({
  selectedLeads,
  hasAssignedLeads,
  assignedLeadsCount,
  isUpdating,
  onAssign,
  onUnassign,
  onStatusChange,
  onDelete,
  filterByCountry,
  onCountryFilterChange,
  countryFilterMode,
  onCountryFilterModeChange,
  filterByStatus,
  onStatusFilterChange,
  statusFilterMode,
  onStatusFilterModeChange,
  filterBySource,
  onSourceFilterChange,
  sourceFilterMode,
  onSourceFilterModeChange,
  isLoading,
  filterByUser,
  onFilterChange,
  statuses,
  isLoadingStatuses = false,
}) => {
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);

  // ✅ Combine all loading states for consistent skeleton display
  const showFilterSkeletons = isLoading || isLoadingStatuses;

  return (
    <>
      <div className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 pb-5 mt-8 bg-white dark:bg-gray-800">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-3 py-4 sm:px-4 border rounded-xl">
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full md:w-auto order-2 md:order-1">
            <ErrorBoundary
              fallback={
                <div className="text-red-500">Bulk actions failed to load</div>
              }
            >
              <BulkActions
                selectedLeads={selectedLeads}
                hasAssignedLeads={hasAssignedLeads}
                assignedLeadsCount={assignedLeadsCount}
                isUpdating={isUpdating}
                onAssign={onAssign}
                onUnassign={onUnassign}
                onStatusChange={onStatusChange || (async () => {})}
                onDelete={onDelete || (async () => {})}
                statuses={statuses}
                isLoadingStatuses={isLoadingStatuses}
              />
            </ErrorBoundary>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 w-full md:w-auto order-1 md:order-2">
            <ErrorBoundary fallback={<FilterSkeleton />}>
              {/* Add Lead Button - with loading skeleton */}
              {showFilterSkeletons ? (
                <div className="w-[120px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              ) : (
                <Button
                  onClick={() => setIsAddLeadDialogOpen(true)}
                  disabled={isLoading}
                  className="text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lead
                </Button>
              )}

              {/* Add Status Button - with loading skeleton */}
              {showFilterSkeletons ? (
                <div className="w-[120px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              ) : (
                <AddStatusButton disabled={isLoading} />
              )}

              {/* User Filter - reads from cache */}
              <UserFilter
                value={filterByUser}
                onChange={onFilterChange}
                disabled={isLoading}
                isLoading={showFilterSkeletons}
              />

              {/* Status Filter - reads from cache */}
              <StatusFilter
                value={filterByStatus}
                onChange={onStatusFilterChange}
                disabled={isLoading}
                isLoading={showFilterSkeletons}
                mode={statusFilterMode}
                onModeChange={onStatusFilterModeChange}
              />

              {/* Source Filter - reads from cache */}
              <SourceFilter
                value={filterBySource}
                onChange={onSourceFilterChange}
                disabled={isLoading}
                isLoading={showFilterSkeletons}
                mode={sourceFilterMode}
                onModeChange={onSourceFilterModeChange}
              />

              {/* Country Filter - reads from cache */}
              <CountryFilter
                value={filterByCountry}
                onChange={onCountryFilterChange}
                mode={countryFilterMode}
                onModeChange={onCountryFilterModeChange}
                disabled={isLoading}
                isLoading={showFilterSkeletons}
              />
            </ErrorBoundary>
          </div>
        </div>
      </div>

      {/* Add Lead Dialog */}
      <AddLeadDialog
        isOpen={isAddLeadDialogOpen}
        onClose={() => setIsAddLeadDialogOpen(false)}
      />
    </>
  );
};

// src/components/dashboardComponents/leadsFilters/LeadFilter.tsx
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
import { useSession } from "next-auth/react";
import { canAssignLeads, canCreateLead, canCreateStatus } from "@/lib/roles";

// ✅ Enhanced Filter Skeleton Component
const FilterSkeleton = () => (
  <div
    className="flex flex-col gap-2 items-stretch w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
    role="status"
    aria-label="Loading filters"
  >
    <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-30 dark:bg-gray-700" />
    <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-30 dark:bg-gray-700" />
    <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-45 dark:bg-gray-700" />
    <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-45 dark:bg-gray-700" />
    <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-45 dark:bg-gray-700" />
    <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-45 dark:bg-gray-700" />
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
  userFilterMode?: "include" | "exclude";
  onUserFilterModeChange?: (mode: "include" | "exclude") => void;
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
  userFilterMode,
  onUserFilterModeChange,
  isLoading,
  filterByUser,
  onFilterChange,
  statuses,
  isLoadingStatuses = false,
}) => {
  const [isAddLeadDialogOpen, setIsAddLeadDialogOpen] = useState(false);
  const { data: session } = useSession();
  const showAddLead = canCreateLead(session?.user);
  const showAddStatus = canCreateStatus(session?.user);
  const showUserFilter = canAssignLeads(session?.user);

  // ✅ Combine all loading states for consistent skeleton display
  const showFilterSkeletons = isLoading || isLoadingStatuses;

  return (
    <>
      <div className="sticky top-0 z-10 px-4 pb-5 mt-8 bg-white sm:px-6 lg:px-8 dark:bg-gray-800">
        <div className="flex flex-col gap-4 px-3 py-4 rounded-xl border min-w-0 md:flex-row md:items-center md:justify-between sm:px-4">
          <div className="flex flex-wrap order-2 gap-2 items-center w-full min-w-0 md:w-auto md:order-1">
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

          <div className="flex flex-col order-1 gap-2 items-stretch w-full min-w-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 md:w-auto md:order-2">
            <ErrorBoundary fallback={<FilterSkeleton />}>
              {showAddLead &&
                (showFilterSkeletons ? (
                <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-30 dark:bg-gray-700" />
              ) : (
                <Button
                  onClick={() => setIsAddLeadDialogOpen(true)}
                  disabled={isLoading}
                  className="w-full text-white from-indigo-600 to-purple-600 bg-linear-to-r hover:from-indigo-700 hover:to-purple-700 sm:w-auto"
                >
                  <Plus className="mr-2 w-4 h-4" />
                  Add Lead
                </Button>
              ))}

              {showAddStatus &&
                (showFilterSkeletons ? (
                <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-30 dark:bg-gray-700" />
              ) : (
                <AddStatusButton disabled={isLoading} />
              ))}

              {showUserFilter && (
              <UserFilter
                value={filterByUser}
                onChange={onFilterChange}
                disabled={isLoading}
                isLoading={showFilterSkeletons}
                mode={userFilterMode}
                onModeChange={onUserFilterModeChange}
              />
              )}

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

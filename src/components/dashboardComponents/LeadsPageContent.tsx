"use client";

import { useCallback, Suspense, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import LeadsTable from "@/components/dashboardComponents/LeadsTable";
import EmptyState from "@/components/dashboardComponents/EmptyState";
import { LeadsHeader } from "./LeadHeader";
import { LeadsFilterControls } from "./leadsFilters/LeadFilter";
import { LeadsDialogs } from "./LeadDialog";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  TableSkeleton,
  LoadingSpinner,
  ErrorBoundary,
} from "./LeadsLoadingState";
import { useLeadsPage } from "@/hooks/useLeadsPage";
import { SubscriptionGuard } from "./SubscriptionGuard";
import { RefetchIndicator } from "@/components/ui/RefetchIndicator";
import { useToggleContext } from "@/context/ToggleContext";
import { Lead } from "@/types/leads";
import { useUpdateLead } from "@/hooks/useLeadDetails";

const USER_ROLES = {
  ADMIN: "ADMIN",
} as const;

interface LeadsPageContentProps {
  searchQuery?: string;
  setLayoutLoading?: (loading: boolean) => void;
}

const LeadsPageContent: React.FC<LeadsPageContentProps> = ({
  searchQuery = "",
  setLayoutLoading,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const queryClient = useQueryClient();

  // Get toggle state from context
  const { showHeader, showControls } = useToggleContext();

  // ✅ Get updateLead mutation from useLeadDetails hook
  const { updateLeadAsync } = useUpdateLead();

  const {
    leads,
    users,
    statuses,
    isLoadingUsers,
    isLoadingStatuses,
    isAssigning,
    isUnassigning,
    selectedLeads,
    filterByUser,
    uiState,
    setUiState,
    filteredLeads,
    counts,
    shouldShowLoading,
    showEmptyState,
    handleAssignLeads,
    handleUnassignLeads,
    handleBulkStatusChange,
    handleBulkDelete,
    handleSelectionChange,
    handleCountryFilterChange,
    handleCountryFilterModeChange,
    handleStatusFilterChange,
    handleStatusFilterModeChange,
    handleSourceFilterChange,
    handleSourceFilterModeChange,
    handleFilterChange,
    hasAssignedLeads,
    isRefetchingLeads,
  } = useLeadsPage(searchQuery, setLayoutLoading);

  // ✅ ADD: Route-based refetch for navigation
  useEffect(() => {
    // Refetch leads when component mounts or when search query changes
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    }
  }, [status, session, queryClient]);

  // Check if any leads are selected
  const hasSelectedLeads = selectedLeads && selectedLeads.length > 0;

  // Auto-show controls when leads are selected, OR respect the manual toggle
  const shouldShowControls = showControls || hasSelectedLeads;

  // ⚡ Memoized handlers to prevent unnecessary re-renders
  const handleLeadUpdate = useCallback(
    async (updatedLead: Lead) => {
      try {
        await updateLeadAsync(updatedLead);
        return true;
      } catch (error) {
        console.error("Error updating lead:", error);
        return false;
      }
    },
    [updateLeadAsync]
  );

  const handleDialogClose = useCallback(() => {
    setUiState((prev) => ({
      ...prev,
      isDialogOpen: false,
      selectedUser: "",
    }));
  }, [setUiState]);

  const handleAssignClick = useCallback(() => {
    setUiState((prev) => ({ ...prev, isDialogOpen: true }));
  }, [setUiState]);

  const handleUnassignClick = useCallback(() => {
    setUiState((prev) => ({ ...prev, isUnassignDialogOpen: true }));
  }, [setUiState]);

  const handleUserSelect = useCallback(
    (user: string) => {
      setUiState((prev) => ({ ...prev, selectedUser: user }));
    },
    [setUiState]
  );

  const handleUnassignDialogChange = useCallback(
    (open: boolean) => {
      setUiState((prev) => ({ ...prev, isUnassignDialogOpen: open }));
    },
    [setUiState]
  );

  // ⚡ Memoized table key to prevent unnecessary re-renders
  const tableKey = useMemo(
    () =>
      `leads-table-${leads.length}-${filterByUser}-${uiState.filterByCountry}-${uiState.filterByStatus}-${uiState.filterBySource}`,
    [
      leads.length,
      filterByUser,
      uiState.filterByCountry,
      uiState.filterByStatus,
      uiState.filterBySource,
    ]
  );

  // ⚡ Early returns for better performance
  if (!isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500">
            You are offline. Please check your connection.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  if (!session?.user?.role || session.user.role !== USER_ROLES.ADMIN) {
    router.push("/dashboard");
    return null;
  }

  return (
    <SubscriptionGuard>
      <div className="flex flex-col h-full bg-background dark:bg-gray-800 border-1 rounded-lg">
        {/* ⚡ Refetch indicator with transition */}
        {isRefetchingLeads && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <RefetchIndicator />
          </div>
        )}

        {/* Conditionally render LeadsHeader with simple fade transition */}
        <div
          className={`transition-opacity duration-300 ease-in-out ${
            showHeader ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{
            marginBottom: showHeader ? "0" : "-100px",
            transition:
              "opacity 300ms ease-in-out, margin-bottom 300ms ease-in-out",
          }}
        >
          <LeadsHeader shouldShowLoading={shouldShowLoading} counts={counts} />
        </div>

        {/* Auto-show controls with simple fade transition */}
        <div
          className={`transition-opacity duration-300 ease-in-out ${
            shouldShowControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          style={{
            marginBottom: shouldShowControls ? "0" : "-80px", // Smooth height transition
            transition:
              "opacity 300ms ease-in-out, margin-bottom 300ms ease-in-out",
          }}
        >
          <LeadsFilterControls
            selectedLeads={selectedLeads}
            hasAssignedLeads={hasAssignedLeads}
            assignedLeadsCount={counts.assigned}
            isUpdating={isAssigning || isUnassigning}
            onAssign={handleAssignClick}
            onUnassign={handleUnassignClick}
            onStatusChange={handleBulkStatusChange}
            onDelete={handleBulkDelete}
            filterByCountry={uiState.filterByCountry}
            onCountryFilterChange={handleCountryFilterChange}
            countryFilterMode={uiState.countryFilterMode}
            onCountryFilterModeChange={handleCountryFilterModeChange}
            filterByStatus={uiState.filterByStatus}
            onStatusFilterChange={handleStatusFilterChange}
            statusFilterMode={uiState.statusFilterMode}
            onStatusFilterModeChange={handleStatusFilterModeChange}
            filterBySource={uiState.filterBySource}
            onSourceFilterChange={handleSourceFilterChange}
            sourceFilterMode={uiState.sourceFilterMode}
            onSourceFilterModeChange={handleSourceFilterModeChange}
            isLoading={shouldShowLoading}
            filterByUser={
              filterByUser === "all" || !filterByUser
                ? []
                : filterByUser.includes(",")
                  ? filterByUser.split(",")
                  : [filterByUser]
            }
            onFilterChange={handleFilterChange}
            users={users}
            statuses={statuses}
            isLoadingStatuses={isLoadingStatuses}
          />
        </div>

        <div className="flex-1 overflow-auto px-8 pb-4 ">
          <ErrorBoundary
            fallback={
              <div className="text-red-500 p-4 text-center">
                <p>Table failed to load</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Reload Page
                </button>
              </div>
            }
          >
            <Suspense fallback={<TableSkeleton />}>
              {shouldShowLoading ? (
                <TableSkeleton />
              ) : showEmptyState ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <EmptyState
                    filterByUser={
                      filterByUser === "all" || !filterByUser
                        ? []
                        : filterByUser.includes(",")
                          ? filterByUser.split(",")
                          : [filterByUser]
                    }
                    filterByCountry={uiState.filterByCountry}
                    filterByStatus={uiState.filterByStatus}
                    filterBySource={uiState.filterBySource}
                    users={users}
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <LeadsTable
                    key={tableKey}
                    leads={filteredLeads}
                    onLeadUpdated={handleLeadUpdate}
                    isLoading={shouldShowLoading}
                    selectedLeads={selectedLeads}
                    users={users}
                    statuses={statuses}
                    onSelectionChange={handleSelectionChange}
                    searchQuery={uiState.searchQuery}
                    filterByUser={filterByUser}
                    filterByCountry={uiState.filterByCountry}
                    filterByStatus={uiState.filterByStatus}
                    filterBySource={uiState.filterBySource}
                  />
                </div>
              )}
            </Suspense>
          </ErrorBoundary>
        </div>

        <LeadsDialogs
          isDialogOpen={uiState.isDialogOpen}
          onDialogClose={handleDialogClose}
          users={users}
          selectedUser={uiState.selectedUser}
          setSelectedUser={handleUserSelect}
          isLoadingUsers={isLoadingUsers}
          isAssigning={isAssigning}
          onAssign={handleAssignLeads}
          onUnassign={handleUnassignLeads}
          selectedLeads={selectedLeads}
          isUnassignDialogOpen={uiState.isUnassignDialogOpen}
          onUnassignDialogChange={handleUnassignDialogChange}
          isUnassigning={isUnassigning}
          assignedLeadsCount={counts.assigned}
        />
      </div>
    </SubscriptionGuard>
  );
};

export default LeadsPageContent;

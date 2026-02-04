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
    handlePageSizeChange,
    handleClearFilters,
    hasAssignedLeads,
    isRefetchingLeads,
    leadsError,
    usersError,
    statusesError,
    refetchAll,
    leadsTotal,
    pageSize,
    page,
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
            className="px-4 py-2 mt-4 text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
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
      <div className="flex flex-col h-full rounded-lg bg-background dark:bg-gray-800 border">
        {/* ⚡ Refetch indicator with transition */}
        {isRefetchingLeads && (
          <div className="duration-200 animate-in slide-in-from-top-2">
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

        <div className="flex-1 px-8 pb-4 overflow-auto ">
          <ErrorBoundary
            fallback={
              <div className="p-4 text-center text-red-500">
                <p>Table failed to load</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 mt-2 text-white transition-colors bg-red-500 rounded hover:bg-red-600"
                >
                  Reload Page
                </button>
              </div>
            }
          >
            <Suspense fallback={<TableSkeleton />}>
              {leadsError || usersError || statusesError ? (
                <div className="p-8 overflow-hidden text-center bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <p className="mb-2 text-red-500 dark:text-red-400">
                    Failed to load data. This can happen in production if the
                    server is slow or the request timed out.
                  </p>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    {leadsError instanceof Error
                      ? leadsError.message
                      : usersError instanceof Error
                        ? usersError.message
                        : statusesError instanceof Error
                          ? statusesError.message
                          : "Unknown error"}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchAll()}
                    className="px-4 py-2 text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
                  >
                    Retry
                  </button>
                </div>
              ) : shouldShowLoading ? (
                <TableSkeleton />
              ) : showEmptyState ? (
                <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
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
                    onClearFilters={handleClearFilters}
                  />
                </div>
              ) : (
                <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <LeadsTable
                    key={tableKey}
                    leads={filteredLeads}
                    totalRows={leadsTotal}
                    pageSize={pageSize}
                    serverPage={page}
                    onPageSizeChange={handlePageSizeChange}
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

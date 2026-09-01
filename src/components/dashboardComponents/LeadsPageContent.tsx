// src/components/dashboardComponents/LeadsPageContent.tsx
"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LeadsTable from "@/components/dashboardComponents/LeadsTable";
import EmptyState from "@/components/dashboardComponents/EmptyState";
import { LeadsHeader } from "./LeadHeader";
import { LeadsFilterControls } from "./leadsFilters/LeadFilter";
import { LeadsDialogs } from "./LeadDialog";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { ErrorBoundary } from "./LeadsLoadingState";
import { AllLeadsPageLoadingShell } from "./AllLeadsPageLoadingShell";
import { useLeadsPage } from "@/hooks/useLeadsPage";
import { SubscriptionGuard } from "./SubscriptionGuard";
import { RefetchIndicator } from "@/components/ui/RefetchIndicator";
import { useToggleContext } from "@/context/ToggleContext";
import { Lead } from "@/types/leads";
import { useUpdateLead } from "@/hooks/useLeadDetails";
import { canAccessAllLeads } from "@/lib/roles";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";

interface LeadsPageContentProps {
  searchQuery?: string;
  setLayoutLoading?: (loading: boolean) => void;
}

const LeadsPageContent: React.FC<LeadsPageContentProps> = ({
  searchQuery = "",
  setLayoutLoading,
}) => {
  const { data: session, status } = useSession();
  const { isLoading: isSubscriptionLoading } = useSubscriptionData();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { showHeader } = useToggleContext();
  const { updateLeadAsync } = useUpdateLead();

  const {
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
    displayFilterByStatus,
    displayFilterByCountry,
    displayFilterBySource,
    displayFilterByUser,
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
    handleUserFilterModeChange,
    handleFilterChange,
    handlePageSizeChange,
    handleServerPageChange,
    handleClearFilters,
    hasAssignedLeads,
    isRefetchingLeads,
    leadsError,
    refetchAll,
    leadsTotal,
    pageSize,
    page,
  } = useLeadsPage(searchQuery, setLayoutLoading);

  const isBootstrapping =
    status === "loading" ||
    isSubscriptionLoading ||
    shouldShowLoading;

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
    [updateLeadAsync],
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
    [setUiState],
  );

  const handleUnassignDialogChange = useCallback(
    (open: boolean) => {
      setUiState((prev) => ({ ...prev, isUnassignDialogOpen: open }));
    },
    [setUiState],
  );

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

  if (status === "unauthenticated") {
    router.push("/");
    return null;
  }

  if (!isBootstrapping && (!session?.user?.role || !canAccessAllLeads(session?.user))) {
    return null;
  }

  return (
    <SubscriptionGuard>
      {isBootstrapping ? (
        <AllLeadsPageLoadingShell showHeader={showHeader} />
      ) : (
        <div className="flex flex-col h-full min-w-0 max-w-full overflow-x-hidden border rounded-lg bg-background dark:bg-gray-800">
          {isRefetchingLeads && (
            <div className="duration-200 animate-in slide-in-from-top-2">
              <RefetchIndicator />
            </div>
          )}

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
            <LeadsHeader shouldShowLoading={false} counts={counts} />
          </div>

          <div className="transition-opacity duration-300 ease-in-out opacity-100">
            <LeadsFilterControls
              selectedLeads={selectedLeads}
              hasAssignedLeads={hasAssignedLeads}
              assignedLeadsCount={counts.assigned}
              isUpdating={isAssigning || isUnassigning}
              onAssign={handleAssignClick}
              onUnassign={handleUnassignClick}
              onStatusChange={handleBulkStatusChange}
              onDelete={handleBulkDelete}
              filterByCountry={displayFilterByCountry}
              onCountryFilterChange={handleCountryFilterChange}
              countryFilterMode={uiState.countryFilterMode}
              onCountryFilterModeChange={handleCountryFilterModeChange}
              filterByStatus={displayFilterByStatus}
              onStatusFilterChange={handleStatusFilterChange}
              statusFilterMode={uiState.statusFilterMode}
              onStatusFilterModeChange={handleStatusFilterModeChange}
              filterBySource={displayFilterBySource}
              onSourceFilterChange={handleSourceFilterChange}
              sourceFilterMode={uiState.sourceFilterMode}
              onSourceFilterModeChange={handleSourceFilterModeChange}
              userFilterMode={uiState.userFilterMode}
              onUserFilterModeChange={handleUserFilterModeChange}
              filterByUser={
                displayFilterByUser === "all" || !displayFilterByUser
                  ? []
                  : displayFilterByUser.includes(",")
                    ? displayFilterByUser.split(",")
                    : [displayFilterByUser]
              }
              onFilterChange={handleFilterChange}
              users={users}
              isLoadingUsers={isLoadingUsers}
              statuses={statuses}
              isLoadingStatuses={isLoadingStatuses}
            />
          </div>

          <div className="flex-1 min-w-0 px-4 pb-4 overflow-auto sm:px-8">
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
              {leadsError ? (
                <div className="p-8 overflow-hidden text-center bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <p className="mb-2 text-red-500 dark:text-red-400">
                    Failed to load leads. This can happen in production if the
                    server is slow or the request timed out.
                  </p>
                  <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    {leadsError instanceof Error
                      ? leadsError.message
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
                    filterByStatus={uiState.filterByStatus.map((statusId) => {
                      const statusObj = statuses.find(
                        (s) => s.id === statusId || s.name === statusId,
                      );
                      return statusObj?.name ?? statusId;
                    })}
                    filterBySource={uiState.filterBySource}
                    users={users}
                    onClearFilters={handleClearFilters}
                    searchQuery={searchQuery}
                  />
                </div>
              ) : (
                <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
                  <LeadsTable
                    leads={filteredLeads}
                    totalRows={leadsTotal}
                    pageSize={pageSize}
                    serverPage={page}
                    onServerPageChange={handleServerPageChange}
                    onPageSizeChange={handlePageSizeChange}
                    onLeadUpdated={handleLeadUpdate}
                    isRefetching={isRefetchingLeads}
                    selectedLeads={selectedLeads}
                    users={users}
                    statuses={statuses}
                    onSelectionChange={handleSelectionChange}
                    searchQuery={
                      isRefetchingLeads ? "" : (uiState.searchQuery ?? "")
                    }
                    filterByUser={filterByUser}
                    filterByCountry={uiState.filterByCountry}
                    filterByStatus={uiState.filterByStatus}
                    filterBySource={uiState.filterBySource}
                  />
                </div>
              )}
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
      )}
    </SubscriptionGuard>
  );
};

export default LeadsPageContent;

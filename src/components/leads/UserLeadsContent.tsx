// src/components/leads/UserLeadsContent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";
import { LoadingSpinner } from "@/components/leads/UserLeadsLoadingStates";
import { FilterLogic } from "@/components/user-leads/FilterLogic";
import { URLStateManager } from "../user-leads/URLStatemanager";
import { SubscriptionGuard } from "@/components/user-leads/SubscriptionGuard";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { useLeadsURLManagement } from "@/hooks/useLeadsURLManagement";
import { useSearchContext } from "@/context/SearchContext";
import { useToggleContext } from "@/context/ToggleContext";
import { useAssignedLeads } from "@/hooks/useAssignedLeads";
import { RefetchIndicator } from "@/components/ui/RefetchIndicator";
import { UserLeadsMainContent } from "@/components/leads/UserLeadsMainContent";
import { SortField, SortOrder } from "@/components/leads/userLeadsTypes";

export default function UserLeadsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const { searchQuery } = useSearchContext();
  const toggleContext = useToggleContext();

  // Use toggle context if available, otherwise default values
  const showHeader = toggleContext?.showHeader ?? true;
  const showControls = toggleContext?.showControls ?? true;

  // React Query hook for leads data
  const { leads, isLoading, isFetching, isError, error, updateLead } =
    useAssignedLeads();

  // React Query hook for subscription (prevents flashing)
  const {
    subscriptionData,
    hasActiveSubscription,
    isLoading: subscriptionLoading,
  } = useSubscriptionData();

  // Local state for UI
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [filterByCountry, setFilterByCountry] = useState<string[]>([]);
  const [filterByStatus, setFilterByStatus] = useState<string[]>([]);
  const [filterBySource, setFilterBySource] = useState<string[]>([]);

  // Get sort parameters from URL or use defaults
  const [sortField, setSortField] = useState<SortField>(() => {
    const urlSortField = searchParams.get("sortField") as SortField;
    return urlSortField || "name";
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const urlSortOrder = searchParams.get("sortOrder") as SortOrder;
    return urlSortOrder || "asc";
  });

  // Helper to parse URL params into string arrays (JSON array or legacy string)
  const parseUrlParamToArray = (param: string | null): string[] => {
    if (!param || param === "all") return [];

    // Prefer JSON array format (same as /dashboard/all-leads)
    try {
      const parsed = JSON.parse(param);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v)).filter(Boolean);
      }
    } catch {
      // Fallback to legacy formats below
    }

    // Legacy formats: "Austria,Germany" or "Austria"
    if (param.includes(",")) {
      return param
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }

    return [param];
  };

  // Initialize filters from URL (kept in sync with query params)
  useEffect(() => {
    const urlCountry = searchParams.get("country");
    const urlStatus = searchParams.get("status");
    const urlSource = searchParams.get("source");

    setFilterByCountry(parseUrlParamToArray(urlCountry));
    setFilterByStatus(parseUrlParamToArray(urlStatus));
    setFilterBySource(parseUrlParamToArray(urlSource));
  }, [searchParams]);

  // Custom hooks - called at component level (only for sort + filters on this page)
  const {
    handleSort: handleURLSort,
    handleCountryFilterChange: handleURLCountryChange,
    handleStatusFilterChange: handleURLStatusChange,
    handleSourceFilterChange: handleURLSourceChange,
  } = useLeadsURLManagement();

  // Lead update handler with React Query mutation
  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      try {
        await updateLead(updatedLead);

        // Update local selected lead state
        if (selectedLead?._id === updatedLead._id) {
          setSelectedLead(updatedLead);
        }

        return true;
      } catch (error) {
        console.error("Failed to update lead:", error);
        return false;
      }
    },
    [updateLead, selectedLead?._id],
  );

  // Sort handler - Fixed to provide all required arguments
  const handleSort = useCallback(
    (field: SortField) => {
      const { newField, newOrder } = handleURLSort(field, sortField, sortOrder);
      setSortField(newField);
      setSortOrder(newOrder);
    },
    [handleURLSort, sortField, sortOrder],
  );

  // Country filter handler
  // Filter change handlers - convert arrays to strings for state/URL compatibility
  const handleCountryFilterChange = useCallback(
    (countries: string[]) => {
      setFilterByCountry(countries);

      // Persist the full selection in the URL using JSON arrays
      const urlValue =
        countries.length === 0 ? "all" : JSON.stringify(countries);
      handleURLCountryChange(urlValue);
    },
    [handleURLCountryChange],
  );

  const handleStatusFilterChange = useCallback(
    (statuses: string[]) => {
      setFilterByStatus(statuses);

      // Persist the full selection in the URL using JSON arrays
      const urlValue = statuses.length === 0 ? "all" : JSON.stringify(statuses);
      handleURLStatusChange(urlValue);
    },
    [handleURLStatusChange],
  );

  const handleSourceFilterChange = useCallback(
    (sources: string[]) => {
      setFilterBySource(sources);

      // Persist the full selection in the URL using JSON arrays
      const urlValue = sources.length === 0 ? "all" : JSON.stringify(sources);
      handleURLSourceChange(urlValue);
    },
    [handleURLSourceChange],
  );

  // Row click handler: open side panel using local state only (no route change)
  const handleRowClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  }, []);

  // Panel close handler: update local state only
  const handlePanelCloseLocal = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedLead(null);
  }, []);

  // Panel navigation handler: move to prev/next lead using local state only
  const handlePanelNavigationLocal = useCallback(
    (
      direction: "prev" | "next",
      currentSelectedLead: Lead,
      sortedLeads: Lead[],
    ) => {
      if (!currentSelectedLead || !sortedLeads.length) return;

      const index = sortedLeads.findIndex(
        (lead) => lead._id === currentSelectedLead._id,
      );
      if (index === -1) return;

      const newIndex = direction === "prev" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sortedLeads.length) return;

      const newLead = sortedLeads[newIndex];
      setSelectedLead(newLead);
      setIsPanelOpen(true);
    },
    [],
  );

  // Auth check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Loading states - Only show loading on first load, not on navigation back
  const isDataReady = !isLoading || leads.length > 0;
  const shouldShowLoading = isLoading && leads.length === 0;

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500! dark:text-red-400! mb-4">
            Failed to load leads: {error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white! rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGuard
      subscriptionLoading={subscriptionLoading}
      hasActiveSubscription={hasActiveSubscription}
      subscriptionData={subscriptionData || null}
    >
      <div className="flex flex-col h-full border rounded-lg bg-background dark:bg-gray-800">
        {/* RefetchIndicator positioned like all-leads */}
        <RefetchIndicator />

        <URLStateManager>
          <FilterLogic
            leads={leads}
            filterByCountry={filterByCountry}
            filterByStatus={filterByStatus}
            filterBySource={filterBySource}
            sortField={sortField}
            sortOrder={sortOrder}
            isDataReady={isDataReady}
            searchQuery={searchQuery}
          >
            {({
              filteredLeads,
              sortedLeads,
              availableCountries,
              availableStatuses,
              availableSources,
            }) => {
              return (
                <UserLeadsMainContent
                  loading={isFetching && !isDataReady}
                  isDataReady={isDataReady}
                  filteredLeads={filteredLeads}
                  sortedLeads={sortedLeads}
                  availableCountries={availableCountries}
                  availableStatuses={availableStatuses}
                  availableSources={availableSources}
                  selectedLead={selectedLead}
                  isPanelOpen={isPanelOpen}
                  filterByCountry={filterByCountry}
                  filterByStatus={filterByStatus}
                  filterBySource={filterBySource}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  shouldShowLoading={shouldShowLoading}
                  showHeader={showHeader}
                  showControls={showControls}
                  currentIndex={
                    selectedLead && isDataReady
                      ? sortedLeads.findIndex(
                          (lead) => lead._id === selectedLead._id,
                        )
                      : -1
                  }
                  totalLeads={leads.length}
                  searchQuery={searchQuery}
                  handleCountryFilterChange={handleCountryFilterChange}
                  handleStatusFilterChange={handleStatusFilterChange}
                  handleSourceFilterChange={handleSourceFilterChange}
                  handleLeadClick={handleRowClick}
                  handleSort={handleSort}
                  handlePanelClose={handlePanelCloseLocal}
                  handleLeadUpdated={handleLeadUpdated}
                  handleNavigation={handlePanelNavigationLocal}
                />
              );
            }}
          </FilterLogic>
        </URLStateManager>
      </div>
    </SubscriptionGuard>
  );
}

// src/components/leads/UserLeadsContent.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";
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
import { UserLeadsPageLoadingShell } from "@/components/leads/UserLeadsPageLoadingShell";
import { SortField, SortOrder } from "@/components/leads/userLeadsTypes";
import {
  isLegacyNumericLeadId,
  isPrefixedLeadId,
  normalizeLeadId,
} from "@/lib/leadId";
import { isStatusOnlyLeadUpdate } from "@/lib/leadClientUpdate";
import { getLiveSearchParam } from "@/lib/liveSearchParams";
import { parseLeadPageSize, snapLeadPageSize } from "@/lib/leadPageSize";
import { humanizeDashboardFetchError } from "@/lib/mongoConnectionError";

export default function UserLeadsContent() {
  const searchParams = useSearchParams()!;
  const pathname = usePathname() || "";
  const { searchQuery } = useSearchContext();
  const toggleContext = useToggleContext();

  // Use toggle context if available, otherwise default values
  const showHeader = toggleContext?.showHeader ?? true;
  const showControls = toggleContext?.showControls ?? true;

  const [pageIndex, setPageIndex] = useState(() =>
    Math.max(0, parseInt(searchParams.get("page") || "1", 10) - 1),
  );
  const [pageSize, setPageSize] = useState(() =>
    parseLeadPageSize(searchParams.get("pageSize")),
  );

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
  const [countryFilterMode, setCountryFilterMode] = useState<"include" | "exclude">(
    () =>
      (searchParams.get("countryMode") === "exclude" ? "exclude" : "include") as
        | "include"
        | "exclude",
  );
  const [statusFilterMode, setStatusFilterMode] = useState<"include" | "exclude">(
    () =>
      (searchParams.get("statusMode") === "exclude" ? "exclude" : "include") as
        | "include"
        | "exclude",
  );
  const [sourceFilterMode, setSourceFilterMode] = useState<"include" | "exclude">(
    () =>
      (searchParams.get("sourceMode") === "exclude" ? "exclude" : "include") as
        | "include"
        | "exclude",
  );

  // Get sort parameters from URL or use defaults
  const [sortField, setSortField] = useState<SortField>(() => {
    const urlSortField = searchParams.get("sortField") as SortField;
    return urlSortField || "lastActivityAt";
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const urlSortOrder = searchParams.get("sortOrder") as SortOrder;
    return urlSortOrder || "desc";
  });

  const {
    leads,
    leadsTotal,
    leadsTotalAll,
    hasLeadsData,
    isFetching,
    isRefetching,
    isError,
    error,
    updateLead,
    refetch,
  } = useAssignedLeads({
    page: pageIndex + 1,
    pageSize,
    filterByCountry,
    filterByStatus,
    filterBySource,
    countryFilterMode,
    statusFilterMode,
    sourceFilterMode,
    searchQuery,
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
    setCountryFilterMode(
      (searchParams.get("countryMode") === "exclude" ? "exclude" : "include") as
        | "include"
        | "exclude",
    );
    setStatusFilterMode(
      (searchParams.get("statusMode") === "exclude" ? "exclude" : "include") as
        | "include"
        | "exclude",
    );
    setSourceFilterMode(
      (searchParams.get("sourceMode") === "exclude" ? "exclude" : "include") as
        | "include"
        | "exclude",
    );
    const nextPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    setPageIndex(nextPage - 1);
    setPageSize(parseLeadPageSize(searchParams.get("pageSize")));
  }, [searchParams]);

  // Custom hooks - called at component level (only for sort + filters on this page)
  const {
    handleSort: handleURLSort,
    handleCountryFilterChange: handleURLCountryChange,
    handleStatusFilterChange: handleURLStatusChange,
    handleSourceFilterChange: handleURLSourceChange,
    handleCountryFilterModeChange: handleURLCountryModeChange,
    handleStatusFilterModeChange: handleURLStatusModeChange,
    handleSourceFilterModeChange: handleURLSourceModeChange,
    handleLeadClick: handleURLLeadClick,
    handlePanelClose: handleURLPanelClose,
    handleNavigation: handleURLNavigation,
  } = useLeadsURLManagement();

  const createParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(Array.from(searchParams.entries()));
  }, [searchParams]);

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = parseInt(value, 10);
      if (Number.isNaN(newSize) || newSize <= 0) return;
      const size = snapLeadPageSize(newSize);
      if (size === pageSize && pageIndex === 0) {
        return;
      }
      setPageSize(size);
      setPageIndex(0);
      const params = createParams();
      params.set("page", "1");
      params.set("pageSize", String(size));
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [createParams, pageIndex, pageSize, pathname],
  );

  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      if (newPageIndex === pageIndex) {
        return;
      }
      setPageIndex(newPageIndex);
      const params = createParams();
      params.set("page", String(newPageIndex + 1));
      const query = params.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [createParams, pageIndex, pathname],
  );

  const prevSearchRef = useRef(searchQuery);
  useEffect(() => {
    if (prevSearchRef.current === searchQuery) return;
    prevSearchRef.current = searchQuery;
    setPageIndex(0);
  }, [searchQuery]);

  // Lead update handler with React Query mutation
  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      const originalLead = leads.find((l) => l._id === updatedLead._id);

      if (originalLead && isStatusOnlyLeadUpdate(originalLead, updatedLead)) {
        if (selectedLead?._id === updatedLead._id) {
          setSelectedLead(updatedLead);
        }
        return true;
      }

      try {
        await updateLead(updatedLead);

        if (selectedLead?._id === updatedLead._id) {
          setSelectedLead(updatedLead);
        }

        return true;
      } catch (error) {
        console.error("Failed to update lead:", error);
        return false;
      }
    },
    [updateLead, selectedLead?._id, leads],
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
      setPageIndex(0);

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
      setPageIndex(0);

      // Persist the full selection in the URL using JSON arrays
      const urlValue = statuses.length === 0 ? "all" : JSON.stringify(statuses);
      handleURLStatusChange(urlValue);
    },
    [handleURLStatusChange],
  );

  const handleSourceFilterChange = useCallback(
    (sources: string[]) => {
      setFilterBySource(sources);
      setPageIndex(0);

      // Persist the full selection in the URL using JSON arrays
      const urlValue = sources.length === 0 ? "all" : JSON.stringify(sources);
      handleURLSourceChange(urlValue);
    },
    [handleURLSourceChange],
  );

  const handleCountryFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      setCountryFilterMode(mode);
      setPageIndex(0);
      handleURLCountryModeChange(mode);
    },
    [handleURLCountryModeChange],
  );

  const handleStatusFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      setStatusFilterMode(mode);
      setPageIndex(0);
      handleURLStatusModeChange(mode);
    },
    [handleURLStatusModeChange],
  );

  const handleSourceFilterModeChange = useCallback(
    (mode: "include" | "exclude") => {
      setSourceFilterMode(mode);
      setPageIndex(0);
      handleURLSourceModeChange(mode);
    },
    [handleURLSourceModeChange],
  );

  // Keep selected lead/panel synced from URL like /dashboard/all-leads.
  useEffect(() => {
    const leadIdParam = getLiveSearchParam("lead", searchParams);
    if (!leadIdParam) {
      if (isPanelOpen || selectedLead) {
        setIsPanelOpen(false);
        setSelectedLead(null);
      }
      return;
    }

    let urlLead: Lead | undefined;
    if (isLegacyNumericLeadId(leadIdParam)) {
      const numericId = parseInt(leadIdParam, 10);
      urlLead = leads.find(
        (l) => normalizeLeadId(l.leadId) === normalizeLeadId(numericId),
      );
    } else if (isPrefixedLeadId(leadIdParam)) {
      urlLead = leads.find(
        (l) =>
          normalizeLeadId(l.leadId).toUpperCase() === leadIdParam.toUpperCase(),
      );
    } else {
      urlLead = leads.find((l) => l._id === leadIdParam);
    }

    if (urlLead) {
      if (!selectedLead || selectedLead._id !== urlLead._id) {
        setSelectedLead(urlLead);
      }
      if (!isPanelOpen) setIsPanelOpen(true);
    }
  }, [searchParams, leads, isPanelOpen, selectedLead]);

  // Row click handler: open side panel and sync URL
  const handleRowClick = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
    handleURLLeadClick(lead);
  }, [handleURLLeadClick]);

  // Panel close handler: update local state and URL
  const handlePanelCloseLocal = useCallback(() => {
    setIsPanelOpen(false);
    setSelectedLead(null);
    handleURLPanelClose();
  }, [handleURLPanelClose]);

  // Panel navigation handler: move to prev/next lead and sync URL
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
      handleURLNavigation(direction, currentSelectedLead, sortedLeads);
    },
    [handleURLNavigation],
  );

  // Keep last-good payload as ready data (placeholder / lastLeadsDataRef).
  // Missing query data is loading — never treat total 0 as a real empty count.
  const isDataReady = hasLeadsData;
  const shouldShowLoading = !hasLeadsData && !isError;
  // Full-page shell only while subscription resolves. After that the real table
  // mounts so the in-table cell skeleton can show (same as all-leads).
  const isBootstrapping = subscriptionLoading;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (
      window as Window & {
        __e2eRefetchAssignedLeads?: () => Promise<unknown>;
      }
    ).__e2eRefetchAssignedLeads = () => refetch();
    return () => {
      delete (
        window as Window & {
          __e2eRefetchAssignedLeads?: () => Promise<unknown>;
        }
      ).__e2eRefetchAssignedLeads;
    };
  }, [refetch]);

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md px-4 text-center">
          <p className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
            Couldn&apos;t load leads
          </p>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            {humanizeDashboardFetchError(error)}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white transition-colors rounded-md bg-(--brand-from) hover:opacity-90"
          >
            Try again
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
      allowAccessWhenExpired
    >
      {isBootstrapping ? (
        <UserLeadsPageLoadingShell
          showHeader={showHeader}
          showControls={showControls}
        />
      ) : (
      <div className="flex flex-col min-h-0 h-full">
        {/* RefetchIndicator positioned like all-leads */}
        <RefetchIndicator />

        <URLStateManager>
          <FilterLogic
            leads={leads}
            filterByCountry={filterByCountry}
            filterByStatus={filterByStatus}
            filterBySource={filterBySource}
            countryFilterMode={countryFilterMode}
            statusFilterMode={statusFilterMode}
            sourceFilterMode={sourceFilterMode}
            sortField={sortField}
            sortOrder={sortOrder}
            isDataReady={isDataReady}
            searchQuery={searchQuery}
            serverFiltered
          >
            {({
              sortedLeads,
              availableCountries,
              availableStatuses,
              availableSources,
            }) => {
              return (
                <UserLeadsMainContent
                  loading={isFetching && !isDataReady}
                  shouldShowLoading={shouldShowLoading}
                  isDataReady={isDataReady}
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
                  showHeader={showHeader}
                  showControls={showControls}
                  currentIndex={
                    selectedLead && isDataReady
                      ? sortedLeads.findIndex(
                          (lead) => lead._id === selectedLead._id,
                        )
                      : -1
                  }
                  totalLeads={leadsTotalAll}
                  leadsTotal={leadsTotal}
                  searchQuery={searchQuery}
                  handleCountryFilterChange={handleCountryFilterChange}
                  handleStatusFilterChange={handleStatusFilterChange}
                  handleSourceFilterChange={handleSourceFilterChange}
                  countryFilterMode={countryFilterMode}
                  statusFilterMode={statusFilterMode}
                  sourceFilterMode={sourceFilterMode}
                  handleCountryFilterModeChange={handleCountryFilterModeChange}
                  handleStatusFilterModeChange={handleStatusFilterModeChange}
                  handleSourceFilterModeChange={handleSourceFilterModeChange}
                  handleLeadClick={handleRowClick}
                  handleSort={handleSort}
                  handlePanelClose={handlePanelCloseLocal}
                  handleLeadUpdated={handleLeadUpdated}
                  handleNavigation={handlePanelNavigationLocal}
                  pageSize={pageSize}
                  pageIndex={pageIndex}
                  onPageSizeChange={handlePageSizeChange}
                  onPageChange={handlePageChange}
                  isRefetching={isRefetching && isDataReady}
                />
              );
            }}
          </FilterLogic>
        </URLStateManager>
      </div>
      )}
    </SubscriptionGuard>
  );
}

// src/components/leads/UserLeadsContent.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Lead } from "@/types/leads";
import { CountsData } from "@/types/pagination.types";
import LeadDetailsPanel from "@/components/dashboardComponents/LeadDetailsPanel";
import { UserLeadsHeader } from "@/components/leads/UserLeadsHeader";
import { UserLeadsFilterControls } from "@/components/leads/UserLeadsFilterControls";
import {
  LoadingSpinner,
  TableSkeleton,
} from "@/components/leads/UserLeadsLoadingStates";
import { FilterLogic } from "@/components/user-leads/FilterLogic";
import { URLStateManager } from "../user-leads/URLStatemanager";
import { SubscriptionGuard } from "@/components/user-leads/SubscriptionGuard";
import { UserLeadsTableContainer } from "@/components/user-leads/UserLeadsTableContainer";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import { useLeadsURLManagement } from "@/hooks/useLeadsURLManagement";
import { useSearchContext } from "@/context/SearchContext";
import { useToggleContext } from "@/context/ToggleContext";
import { useAssignedLeads } from "@/hooks/useAssignedLeads";
import { RefetchIndicator } from "@/components/ui/RefetchIndicator";

type SortField =
  | "leadId"
  | "name"
  | "country"
  | "status"
  | "source"
  | "assignedTo"
  | "createdAt"
  | "lastComment"
  | "lastCommentDate"
  | "commentCount";
type SortOrder = "asc" | "desc";

export default function UserLeadsContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
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
      return param.split(",").map((v) => v.trim()).filter(Boolean);
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
    [updateLead, selectedLead?._id]
  );

  // Sort handler - Fixed to provide all required arguments
  const handleSort = useCallback(
    (field: SortField) => {
      const { newField, newOrder } = handleURLSort(field, sortField, sortOrder);
      setSortField(newField);
      setSortOrder(newOrder);
    },
    [handleURLSort, sortField, sortOrder]
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
    [handleURLCountryChange]
  );

  const handleStatusFilterChange = useCallback(
    (statuses: string[]) => {
      setFilterByStatus(statuses);

      // Persist the full selection in the URL using JSON arrays
      const urlValue =
        statuses.length === 0 ? "all" : JSON.stringify(statuses);
      handleURLStatusChange(urlValue);
    },
    [handleURLStatusChange]
  );

  const handleSourceFilterChange = useCallback(
    (sources: string[]) => {
      setFilterBySource(sources);

      // Persist the full selection in the URL using JSON arrays
      const urlValue =
        sources.length === 0 ? "all" : JSON.stringify(sources);
      handleURLSourceChange(urlValue);
    },
    [handleURLSourceChange]
  );

  // Row click handler: open side panel using local state only (no route change)
  const handleRowClick = useCallback(
    (lead: Lead) => {
      setSelectedLead(lead);
      setIsPanelOpen(true);
    },
    []
  );

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
      sortedLeads: Lead[]
    ) => {
      if (!currentSelectedLead || !sortedLeads.length) return;

      const index = sortedLeads.findIndex(
        (lead) => lead._id === currentSelectedLead._id
      );
      if (index === -1) return;

      const newIndex = direction === "prev" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= sortedLeads.length) return;

      const newLead = sortedLeads[newIndex];
      setSelectedLead(newLead);
      setIsPanelOpen(true);
    },
    []
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
          <p className="!text-red-500 dark:!text-red-400 mb-4">
            Failed to load leads: {error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 !text-white rounded hover:bg-blue-600 transition-colors"
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
      <div className="flex flex-col h-full bg-background dark:bg-gray-800 border-1 rounded-lg">
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
                          (lead) => lead._id === selectedLead._id
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

interface UserLeadsMainContentProps {
  loading: boolean;
  isDataReady: boolean;
  filteredLeads: Lead[];
  sortedLeads: Lead[];
  availableCountries: string[];
  availableStatuses: string[];
  availableSources: string[];
  selectedLead: Lead | null;
  isPanelOpen: boolean;
  filterByCountry: string[];
  filterByStatus: string[];
  filterBySource: string[];
  sortField: SortField;
  sortOrder: SortOrder;
  shouldShowLoading: boolean;
  showHeader: boolean;
  showControls: boolean;
  currentIndex: number;
  totalLeads: number;
  searchQuery?: string;
  handleCountryFilterChange: (countries: string[]) => void;
  handleStatusFilterChange: (statuses: string[]) => void;
  handleSourceFilterChange: (sources: string[]) => void;
  handleLeadClick: (lead: Lead) => void;
  handleSort: (field: SortField) => void;
  handlePanelClose: () => void;
  handleLeadUpdated: (lead: Lead) => Promise<boolean>;
  handleNavigation: (
    direction: "prev" | "next",
    selectedLead: Lead,
    sortedLeads: Lead[]
  ) => void;
}

const UserLeadsMainContent: React.FC<UserLeadsMainContentProps> = ({
  loading,
  isDataReady,
  filteredLeads,
  sortedLeads,
  availableCountries,
  availableStatuses,
  availableSources,
  selectedLead,
  isPanelOpen,
  filterByCountry,
  filterByStatus,
  filterBySource,
  sortField,
  sortOrder,
  shouldShowLoading,
  showHeader,
  showControls,
  currentIndex,
  totalLeads,
  searchQuery = "",
  handleCountryFilterChange,
  handleStatusFilterChange,
  handleSourceFilterChange,
  handleLeadClick,
  handleSort,
  handlePanelClose,
  handleLeadUpdated,
  handleNavigation,
}) => {
  // URL & router for pagination persistence (like all-leads)
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL with fallback (pageSize default 15, page default 1)
  const initialPageFromUrl = Math.max(
    1,
    parseInt(searchParams.get("page") || "1", 10)
  );
  const initialPageSizeFromUrl = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10))
  );

  // Local pagination state (TanStack will paginate full sortedLeads)
  const [pageSize, setPageSize] = useState<number>(initialPageSizeFromUrl);
  const [pageIndex, setPageIndex] = useState<number>(initialPageFromUrl - 1);

  // Update URL when page size changes; reset to page 1
  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = parseInt(value, 10);
      if (Number.isNaN(newSize) || newSize <= 0) return;

      const size = Math.min(500, Math.max(1, newSize));
      setPageSize(size);
      setPageIndex(0);

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set("pageSize", String(size));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  // Update URL when page index changes (preserve pageSize)
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      setPageIndex(newPageIndex);

      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", String(newPageIndex + 1));
      params.set("pageSize", String(pageSize));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams, pageSize]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLeads.length / pageSize) || 1
  );

  // Calculate counts with proper typing
  const counts: CountsData = isDataReady
    ? {
        total: totalLeads,
        filtered: filteredLeads.length,
        currentPage: Math.min(
          pageSize,
          Math.max(filteredLeads.length - pageIndex * pageSize, 0)
        ),
        totalPages,
        countries: availableCountries.length,
        statuses: availableStatuses.length,
      }
    : {
        total: 0,
        filtered: 0,
        currentPage: 0,
        totalPages: 0,
        countries: 0,
        statuses: 0,
      };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-gray-800 border-1 rounded-lg">
      {/* Conditionally render header with smooth fade transition */}
      <div
        className={`transition-opacity duration-300 ease-in-out px-8 mt-4 ${
          showHeader ? "opacity-100" : "opacity-0 pointer-events-none mt-10"
        }`}
        style={{
          marginBottom: showHeader ? "0" : "-100px",
          transition:
            "opacity 300ms ease-in-out, margin-bottom 300ms ease-in-out",
        }}
      >
        <UserLeadsHeader
          shouldShowLoading={shouldShowLoading}
          counts={counts}
        />
      </div>

      {/* Conditionally render filter controls with smooth fade transition */}
      <div
        className={`transition-opacity duration-300 ease-in-out px-8 py-6 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          marginBottom: showControls ? "0" : "-80px",
          transition:
            "opacity 300ms ease-in-out, margin-bottom 300ms ease-in-out",
        }}
      >
        <UserLeadsFilterControls
          shouldShowLoading={shouldShowLoading}
          filterByCountry={filterByCountry}
          filterByStatus={filterByStatus}
          filterBySource={filterBySource}
          onCountryFilterChange={handleCountryFilterChange}
          onStatusFilterChange={handleStatusFilterChange}
          onSourceFilterChange={handleSourceFilterChange}
          availableCountries={availableCountries}
          availableStatuses={availableStatuses}
          availableSources={availableSources}
          counts={counts}
        />
      </div>

      {/* Main content area: loading skeleton, search/filter empty state, or table (match all-leads behavior) */}
      <div className="flex-1 overflow-auto px-8 pb-4">
        {shouldShowLoading ? (
          <TableSkeleton />
        ) : filteredLeads.length === 0 ? (
          <div className="flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-2 min-h-[280px]">
            <div className="text-center space-y-4 max-w-md mx-auto px-6 py-12">
              {searchQuery.trim() ? (
                <>
                  <div className="flex justify-center text-gray-400">
                    <svg
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    No leads found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    No leads match your search for &quot;{searchQuery.trim()}&quot;. Try
                    adjusting your search terms or clearing the search.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Clear search or try different keywords
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-center text-gray-400">
                    <svg
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    No leads available
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    You don&apos;t have any assigned leads yet, or no leads match
                    your current filters.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-2">
            <UserLeadsTableContainer
              loading={loading}
              leads={sortedLeads}
              pageSize={pageSize}
              pageIndex={pageIndex}
              totalEntries={counts.filtered}
              totalPages={totalPages}
              selectedLead={selectedLead}
              sortField={sortField}
              sortOrder={sortOrder}
              onLeadClick={handleLeadClick}
              onSort={handleSort}
              onPageSizeChange={handlePageSizeChange}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Lead Details Panel */}
      {isPanelOpen && selectedLead && isDataReady && selectedLead && (
        <LeadDetailsPanel
          key={selectedLead._id}
          lead={selectedLead}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
          onLeadUpdated={handleLeadUpdated}
          onNavigate={(direction) =>
            handleNavigation(direction, selectedLead, sortedLeads)
          }
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sortedLeads.length - 1}
        />
      )}
    </div>
  );
};

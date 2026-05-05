"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LeadDetailsPanel from "@/components/dashboardComponents/LeadDetailsPanel";
import { UserLeadsHeader } from "@/components/leads/UserLeadsHeader";
import { UserLeadsFilterControls } from "@/components/leads/UserLeadsFilterControls";
import { TableSkeleton } from "@/components/leads/UserLeadsLoadingStates";
import { UserLeadsTableContainer } from "@/components/user-leads/UserLeadsTableContainer";
import { Lead } from "@/types/leads";
import { CountsData } from "@/types/pagination.types";
import { SortField, SortOrder } from "@/components/leads/userLeadsTypes";

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
    sortedLeads: Lead[],
  ) => void;
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex items-center justify-center mb-2 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 min-h-70">
      <div className="max-w-md px-6 py-12 mx-auto space-y-4 text-center">
        {searchQuery.trim() ? (
          <>
            <div className="flex justify-center text-gray-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No leads found</h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              No leads match your search for &quot;{searchQuery.trim()}&quot;. Try adjusting your search terms or clearing the search.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Clear search or try different keywords</p>
          </>
        ) : (
          <>
            <div className="flex justify-center text-gray-400">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No leads available</h3>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              You don&apos;t have any assigned leads yet, or no leads match your current filters.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function UserLeadsMainContent({
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
}: UserLeadsMainContentProps) {
  const searchParams = useSearchParams()!;
  const router = useRouter();
  const pathname = usePathname() || "";

  const initialPageFromUrl = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const initialPageSizeFromUrl = Math.min(500, Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10)));
  const [pageSize, setPageSize] = useState<number>(initialPageSizeFromUrl);
  const [pageIndex, setPageIndex] = useState<number>(initialPageFromUrl - 1);

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
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      setPageIndex(newPageIndex);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", String(newPageIndex + 1));
      params.set("pageSize", String(pageSize));
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, pageSize],
  );

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize) || 1);
  const counts: CountsData = isDataReady
    ? {
        total: totalLeads,
        filtered: filteredLeads.length,
        currentPage: Math.min(pageSize, Math.max(filteredLeads.length - pageIndex * pageSize, 0)),
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
    <div className="flex flex-col flex-1 min-h-0 h-full border rounded-lg bg-background dark:bg-gray-800">
      <div
        className={`shrink-0 transition-opacity duration-300 ease-in-out ${showHeader ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ marginBottom: showHeader ? "0" : "-100px", transition: "opacity 300ms ease-in-out, margin-bottom 300ms ease-in-out" }}
      >
        <UserLeadsHeader shouldShowLoading={shouldShowLoading} counts={counts} />
      </div>

      <div
        className={`shrink-0 transition-opacity duration-300 ease-in-out ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ marginBottom: showControls ? "0" : "-80px", transition: "opacity 300ms ease-in-out, margin-bottom 300ms ease-in-out" }}
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

      <div className="flex-1 min-h-0 px-8 pb-4 overflow-auto">
        {shouldShowLoading ? (
          <TableSkeleton />
        ) : filteredLeads.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : (
          <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
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

      {isPanelOpen && selectedLead && isDataReady && (
        <LeadDetailsPanel
          lead={selectedLead}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
          onLeadUpdated={handleLeadUpdated}
          onNavigate={(direction) => handleNavigation(direction, selectedLead, sortedLeads)}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sortedLeads.length - 1}
        />
      )}
    </div>
  );
}

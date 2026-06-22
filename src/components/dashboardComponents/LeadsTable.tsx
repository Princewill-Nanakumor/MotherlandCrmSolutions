// src/components/dashboardComponents/LeadsTable.tsx
"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { EmptyStateAdminLeadsTable } from "./EmptyStateAdminLeadsTable";
import LeadDetailsPanel from "@/components/dashboardComponents/LeadDetailsPanel";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { TableHeader as CustomTableHeader } from "@/components/leads/LeadsTable/TableHeader";
import { TableContent } from "@/components/leads/TableContent";
import { TablePagination } from "@/components/leads/TablePagination";
import { Table } from "@/components/ui/Table";
import {
  useSelectedLead,
  useSetSelectedLead,
  useSetIsPanelOpen,
  useSorting,
  useSetSorting,
  useSelectedLeads,
  useSetSelectedLeads,
} from "@/stores/leadsStore";
import { SortField } from "@/types/table";
import { useTableSorting } from "./TableSorting";
import { useRowSelection } from "./RowSelection";
import { usePanelNavigation } from "./PanelNavigation";
import { useTableColumns } from "./TableColumns";
import { useTableConfiguration } from "./TableConfiguration";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { Loader } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  isLegacyNumericLeadId,
  isPrefixedLeadId,
  normalizeLeadId,
} from "@/lib/leadId";

interface LeadsTableProps {
  leads: Lead[];
  /** When set, pagination is server-side: leads = current page only, totalRows = total count */
  totalRows?: number;
  /** Page size when using server-side pagination (optional; default 15) */
  pageSize?: number;
  /** Current page (1-based) when using server-side pagination; keeps table in sync when filters change */
  serverPage?: number;
  /** When set, table calls this on page change (1-based) so parent can update state + URL and refetch */
  onServerPageChange?: (pageOneBased: number) => void;
  /** When set (e.g. server-side pagination), page size changes update URL and refetch */
  onPageSizeChange?: (pageSize: number) => void;
  onLeadUpdated: (lead: Lead) => Promise<boolean>;
  isLoading?: boolean;
  /** When true, table is refetching (e.g. after filter change); show subtle updating state */
  isRefetching?: boolean;
  users: User[];
  statuses?: Array<{ id: string; name: string; color?: string }>;
  selectedLeads?: Lead[];
  onSelectionChange?: (leads: Lead[]) => void;
  searchQuery?: string;
  filterByUser?: string | string[];
  filterByCountry?: string | string[];
  filterByStatus?: string | string[];
  filterBySource?: string | string[];
}

export default function LeadsTable({
  leads = [],
  totalRows: serverTotalRows,
  pageSize: serverPageSize,
  serverPage: serverPageProp,
  onServerPageChange,
  onPageSizeChange,
  onLeadUpdated,
  isLoading = false,
  isRefetching = false,
  users = [],
  statuses = [],
  selectedLeads = [],
  onSelectionChange,
  searchQuery = "",
  filterByUser = "all",
  filterByCountry = "all",
  filterByStatus = "all",
  filterBySource = "all",
}: LeadsTableProps) {
  const pathname = usePathname() || "";
  const isServerPagination = typeof serverTotalRows === "number";
  // Normalize filters to arrays for consistent handling
  const normalizeFilter = (filter: string | string[] | undefined): string[] => {
    if (!filter) return [];
    if (Array.isArray(filter)) return filter;
    if (filter === "all") return [];
    // Handle comma-separated string (for user filter)
    if (filter.includes(",")) return filter.split(",");
    return [filter];
  };

  const userFilter = normalizeFilter(filterByUser);
  const countryFilter = normalizeFilter(filterByCountry);
  const statusFilter = normalizeFilter(filterByStatus);
  const sourceFilter = normalizeFilter(filterBySource);
  // Store hooks (NOT for pagination)
  const selectedLead = useSelectedLead();
  const setSelectedLead = useSetSelectedLead();
  const setIsPanelOpen = useSetIsPanelOpen();
  const sorting = useSorting();
  const setSorting = useSetSorting();
  const storeSelectedLeads = useSelectedLeads();
  const setStoreSelectedLeads = useSetSelectedLeads();
  const isInitializedRef = useRef(false);

  // URL and pagination state (LOCAL ONLY - no store). When server-side, use serverPage prop so filter change shows page 1 immediately.
  const searchParams = useSearchParams()!;
  const [pageIndex, setPageIndex] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(15);
  const pageSize = isServerPagination ? (serverPageSize ?? 15) : localPageSize;
  const effectivePageIndex =
    isServerPagination && typeof serverPageProp === "number"
      ? Math.max(0, serverPageProp - 1)
      : pageIndex;

  // Keep local pageIndex in sync when parent passes server page (e.g. after filter change)
  useEffect(() => {
    if (
      isServerPagination &&
      typeof serverPageProp === "number" &&
      pageIndex !== serverPageProp - 1
    ) {
      setPageIndex(Math.max(0, serverPageProp - 1));
    }
  }, [isServerPagination, serverPageProp, pageIndex]);

  // Column ordering with localStorage persistence
  const { columnOrder, setColumnOrder } = useColumnOrder();

  // Column visibility with localStorage persistence
  const { columnVisibility, setColumnVisibility } =
    useColumnVisibility("adminLeadsTable");

  // DnD Kit sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // We'll define handleDragEnd after table is created

  // --- STABILIZED SORTING STATE ---
  const stableSorting = useMemo(() => {
    if (!sorting || sorting.length === 0) {
      return [{ id: "lastActivityAt", desc: true }];
    }
    return sorting;
  }, [sorting]);

  // Sync pageIndex with URL on mount ONLY (not on every URL change)
  useEffect(() => {
    if (isInitializedRef.current) return;

    const pageParam = searchParams?.get("page");
    if (pageParam && !isNaN(Number(pageParam))) {
      const newPageIndex = Number(pageParam) - 1;
      setPageIndex(newPageIndex);
    }

    isInitializedRef.current = true;
  }, [searchParams]);

  // Preserve page position when URL changes (but don't fight user interaction)
  // Only sync from URL when searchParams change, NOT when leads.length changes
  // This prevents resetting pagination when filtered results change
  useEffect(() => {
    const currentPage = searchParams?.get("page");

    if (currentPage && !isNaN(Number(currentPage))) {
      const targetPage = Number(currentPage) - 1;
      // Only update if different to avoid unnecessary updates and infinite loops
      if (targetPage !== pageIndex) {
        setPageIndex(targetPage);
      }
    } else if (!currentPage && pageIndex !== 0) {
      // If URL has no page param and we're not on page 0, sync to 0
      setPageIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams, not pageIndex to avoid circular updates

  // Update URL when page changes. With server pagination, parent's onServerPageChange
  // updates state + URL immediately so the next page fetches without relying on useSearchParams.
  const handlePageChange = useCallback(
    (page: number) => {
      const pageOneBased = page + 1;
      setPageIndex(page);
      if (isServerPagination && onServerPageChange) {
        onServerPageChange(pageOneBased);
      } else {
        const params = new URLSearchParams(
          searchParams ? Array.from(searchParams.entries()) : [],
        );
        params.set("page", String(pageOneBased));
        const query = params.toString();
        const url = query ? `${pathname}?${query}` : pathname;
        window.history.replaceState(null, "", url);
      }
    },
    [isServerPagination, onServerPageChange, pathname, searchParams],
  );

  // Use props selectedLeads if provided, otherwise use store
  const displaySelectedLeads =
    selectedLeads.length > 0 ? selectedLeads : storeSelectedLeads;

  // Custom hooks
  const { sortedLeads, handleSort } = useTableSorting({
    leads,
    sortField: (stableSorting[0]?.id as SortField) || "lastActivityAt",
    sortOrder: stableSorting[0]?.desc ? "desc" : "asc",
    users,
    searchQuery,
    onSortChange: useCallback(
      (field, order) => {
        setSorting([{ id: field, desc: order === "desc" }]);
      },
      [setSorting],
    ),
  });

  // ✅ FIX: Keep selectedLead in sync with full leads array
  // This ensures selectedLead always has the latest data, even if filtered out
  // KEY: Never close panel if URL has lead parameter (lead might just be filtered out)
  useEffect(() => {
    const leadIdParam = searchParams.get("lead");

    // If URL has lead parameter, NEVER close the panel (lead might be filtered out)
    if (leadIdParam && selectedLead) {
      // Just update selectedLead if we have newer data, but keep panel open
      if (leads.length > 0) {
        const updatedLead = leads.find((l) => l._id === selectedLead._id);
        if (updatedLead) {
          // Update selectedLead if key fields have changed (status, updatedAt, etc.)
          if (
            updatedLead.status !== selectedLead.status ||
            updatedLead.updatedAt !== selectedLead.updatedAt ||
            updatedLead.firstName !== selectedLead.firstName ||
            updatedLead.lastName !== selectedLead.lastName ||
            updatedLead.email !== selectedLead.email ||
            updatedLead.phone !== selectedLead.phone
          ) {
            setSelectedLead(updatedLead);
          }
        }
        // If lead not found but URL has param, keep panel open with current selectedLead
        // (lead is filtered out, not deleted)
      }
      return; // Don't proceed to closing logic if URL has lead param
    }

    // Only check for deletion if there's NO lead parameter in URL
    if (selectedLead && leads.length > 0 && !leadIdParam) {
      const updatedLead = leads.find((l) => l._id === selectedLead._id);
      if (updatedLead) {
        // Update selectedLead if key fields have changed
        if (
          updatedLead.status !== selectedLead.status ||
          updatedLead.updatedAt !== selectedLead.updatedAt ||
          updatedLead.firstName !== selectedLead.firstName ||
          updatedLead.lastName !== selectedLead.lastName ||
          updatedLead.email !== selectedLead.email ||
          updatedLead.phone !== selectedLead.phone
        ) {
          setSelectedLead(updatedLead);
        }
      } else {
        // Lead not found in full leads array AND no URL param - lead was deleted
        setSelectedLead(null);
        setIsPanelOpen(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, selectedLead?._id, searchParams]); // Include searchParams to check for lead param

  // ✅ FIX: Read lead parameter from URL and open panel automatically
  // ✅ FIX: Keep panel open even if lead is filtered out (only close if lead is deleted)
  useEffect(() => {
    const leadIdParam = searchParams.get("lead");

    if (leadIdParam && leads.length > 0) {
      // Always search in full leads array (not filtered sortedLeads)
      // This ensures we find the lead even if it's been filtered out
      const isNumericId = isLegacyNumericLeadId(leadIdParam);
      let lead: Lead | undefined;

      if (isNumericId) {
        const numericId = parseInt(leadIdParam, 10);
        lead = leads.find(
          (l) => normalizeLeadId(l.leadId) === normalizeLeadId(numericId)
        );
      } else if (isPrefixedLeadId(leadIdParam)) {
        lead = leads.find(
          (l) =>
            normalizeLeadId(l.leadId).toUpperCase() === leadIdParam.toUpperCase()
        );
      } else {
        lead = leads.find((l) => l._id === leadIdParam);
      }

      if (lead) {
        // Lead exists - update selectedLead if it's different
        if (!selectedLead || selectedLead._id !== lead._id) {
          setSelectedLead(lead);
          setIsPanelOpen(true);
        }
      }
      // If lead not found but URL has param, keep panel open with current selectedLead
      // (lead might be filtered out, not deleted - don't close panel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, leads]); // Depend on searchParams and leads

  // ⚡ Adjust pageIndex when filtered results change (client-side only)
  useEffect(() => {
    if (isServerPagination) return;
    if (sortedLeads.length === 0) {
      // If no leads, go to page 0
      if (pageIndex !== 0) {
        setPageIndex(0);
        const currentPathname = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        params.set("page", "1");
        window.history.replaceState(
          {},
          "",
          `${currentPathname}?${params.toString()}`,
        );
      }
      return;
    }

    const startIndex = pageIndex * pageSize;
    const currentPageEmpty = startIndex >= sortedLeads.length;
    const totalPages = Math.ceil(sortedLeads.length / pageSize);

    // If current page is out of bounds (e.g., lead was removed from filter), adjust to last available page
    if (currentPageEmpty && pageIndex > 0 && sortedLeads.length > 0) {
      const newPageIndex = Math.max(0, totalPages - 1);
      if (newPageIndex !== pageIndex && newPageIndex >= 0) {
        setPageIndex(newPageIndex);
        const currentPathname = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        params.set("page", String(newPageIndex + 1));
        window.history.replaceState(
          {},
          "",
          `${currentPathname}?${params.toString()}`,
        );
      }
    }
  }, [isServerPagination, sortedLeads.length, pageIndex, pageSize]);

  const totalRows = isServerPagination
    ? (serverTotalRows ?? 0)
    : sortedLeads.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));

  // With server pagination we only pass one page of data; table must use pageIndex 0 so getPaginationRowModel() shows all rows. Pagination UI still uses effectivePageIndex.
  const tablePageIndex = isServerPagination ? 0 : effectivePageIndex;

  // Current page: server = leads (one page), client = slice
  const currentPageLeads = useMemo(() => {
    if (isServerPagination) return sortedLeads;
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedLeads.slice(startIndex, endIndex);
  }, [isServerPagination, sortedLeads, pageIndex, pageSize]);

  const {
    rowSelection,
    allSelected,
    selectAllRef,
    handleSelectAll,
    handleRowSelection,
  } = useRowSelection({
    selectedLeads: displaySelectedLeads,
    currentPageLeads,
    onSelectionChange: (leads) => {
      setStoreSelectedLeads(leads);
      onSelectionChange?.(leads);
    },
  });

  const { handleRowClick, handlePanelClose, handleNavigate, currentIndex } =
    usePanelNavigation({
      selectedLead,
      sortedLeads,
      setSelectedLead,
      setIsPanelOpen,
    });

  // When a lead is updated from the panel, update the store so the panel shows new data
  // (e.g. after status change the lead may no longer be in the filtered list)
  const handleLeadUpdatedFromPanel = useCallback(
    async (updatedLead: Lead) => {
      const ok = await onLeadUpdated(updatedLead);
      if (ok) {
        setSelectedLead(updatedLead);
      }
      return ok;
    },
    [onLeadUpdated, setSelectedLead],
  );

  const { columns } = useTableColumns({
    sortField: (stableSorting[0]?.id as SortField) || "lastActivityAt",
    sortOrder: stableSorting[0]?.desc ? "desc" : "asc",
    handleSort,
    allSelected,
    selectedLeads: displaySelectedLeads,
    handleSelectAll,
    handleRowSelection,
    users,
    selectAllRef,
    statuses,
  });

  const { table } = useTableConfiguration({
    data: sortedLeads,
    columns,
    pageSize,
    pageIndex: tablePageIndex,
    isServerPagination,
    sorting: stableSorting,
    rowSelection,
    columnOrder,
    columnVisibility,
    setSorting,
    setPageIndex: handlePageChange,
    setPageSize: isServerPagination ? () => {} : setLocalPageSize,
    setColumnOrder,
    setColumnVisibility,
  });

  // Handle column drag end - defined after table is created
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = columnOrder.findIndex((id) => id === active.id);
        const newIndex = columnOrder.findIndex((id) => id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newColumnOrder = arrayMove(columnOrder, oldIndex, newIndex);
          setColumnOrder(newColumnOrder);
          // Update table column order
          table.setColumnOrder(newColumnOrder);
        }
      }
    },
    [columnOrder, setColumnOrder, table],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader />
      </div>
    );
  }

  const showEmptyState = sortedLeads.length === 0;

  return (
    <>
      <div className="rounded-lg shadow dark:bg-gray-800 dark:text-white">
        <div className="p-4">
          <CustomTableHeader
            table={table}
            pageSize={pageSize}
            pageIndex={effectivePageIndex}
            totalRows={totalRows}
            tableId="adminLeadsTable"
            onPageSizeChange={onPageSizeChange}
            isRefetching={isRefetching}
          />
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            {showEmptyState ? (
              <EmptyStateAdminLeadsTable
                searchQuery={searchQuery}
                filterByUser={userFilter}
                filterByCountry={countryFilter}
                filterByStatus={statusFilter}
                filterBySource={sourceFilter}
                hasFilters={
                  filterByUser !== "all" ||
                  filterByCountry !== "all" ||
                  filterByStatus !== "all" ||
                  filterBySource !== "all"
                }
                users={users}
              />
            ) : (
              <TableContent
                table={table}
                onRowClick={handleRowClick}
                selectedLead={selectedLead}
              />
            )}
          </Table>
        </DndContext>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <TablePagination
            pageIndex={effectivePageIndex}
            pageCount={pageCount}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {selectedLead && (
        <LeadDetailsPanel
          lead={selectedLead}
          isOpen={true}
          users={users}
          onLeadUpdated={handleLeadUpdatedFromPanel}
          onClose={handlePanelClose}
          onNavigate={handleNavigate}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sortedLeads.length - 1}
        />
      )}
    </>
  );
}

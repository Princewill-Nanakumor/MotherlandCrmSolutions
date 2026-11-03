// src/components/dashboardComponents/LeadsTable.tsx
"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, usePathname } from "next/navigation";
import { DEFAULT_LEAD_PAGE_SIZE } from "@/lib/leadPageSize";
import { EmptyStateAdminLeadsTable } from "./EmptyStateAdminLeadsTable";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { TableHeader as CustomTableHeader } from "@/components/leads/LeadsTable/TableHeader";
import { TableContent } from "@/components/leads/TableContent";
import { TablePagination } from "@/components/leads/TablePagination";
import { Table } from "@/components/ui/Table";
import {
  useSelectedLead,
  useSetSelectedLead,
  useCloseLeadPanel,
  useSorting,
  useSetSorting,
  useSelectedLeads,
  useSetSelectedLeads,
} from "@/stores/leadsStore";
import { SortField } from "@/types/table";
import { useTableSorting } from "./TableSorting";
import { useRowSelection } from "./RowSelection";
import {
  useLeadPanelClose,
  useLeadPanelHostNavigation,
  useLeadPanelRowActions,
} from "./PanelNavigation";
import { useTableColumns } from "./TableColumns";
import { useTableConfiguration } from "./TableConfiguration";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useClearLeadSelectionOnEscape } from "@/hooks/useClearLeadSelectionOnEscape";
import { mergeLeadContactExtrasIfSame } from "@/lib/leadClientUpdate";
import { loadLeadDetailsPanel } from "@/lib/leadDetailsPanelLoad";
import { useMountedLeadPanel } from "@/hooks/useMountedLeadPanel";
import { SelectedLeadRowHighlight } from "@/components/leads/SelectedLeadRowHighlight";
import { LeadsTableScroll } from "@/components/leads/LeadsTableScroll";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { getLiveLeadParam } from "@/lib/liveSearchParams";
import type { LeadFilterMode } from "@/lib/leadEmptyFilterDescription";
import { useRestoreLeadPanelFromUrl } from "@/hooks/useRestoreLeadPanelFromUrl";

const LeadDetailsPanel = dynamic(loadLeadDetailsPanel, { ssr: false });

function leadRowNeedsPanelResync(prev: Lead, next: Lead): boolean {
  const prevAssignee =
    typeof prev.assignedTo === "object" && prev.assignedTo
      ? prev.assignedTo.id ?? (prev.assignedTo as { _id?: string })._id
      : prev.assignedTo;
  const nextAssignee =
    typeof next.assignedTo === "object" && next.assignedTo
      ? next.assignedTo.id ?? (next.assignedTo as { _id?: string })._id
      : next.assignedTo;
  return (
    next.status !== prev.status ||
    next.updatedAt !== prev.updatedAt ||
    next.firstName !== prev.firstName ||
    next.lastName !== prev.lastName ||
    next.email !== prev.email ||
    next.phone !== prev.phone ||
    String(nextAssignee ?? "") !== String(prevAssignee ?? "")
  );
}

/** Subscribes to selectedLead — keep out of the table render path. */
function LeadsTablePanelHost({
  leads,
  sortedLeads,
  users,
  isRefetching,
  onLeadUpdated,
}: {
  leads: Lead[];
  sortedLeads: Lead[];
  users: User[];
  isRefetching: boolean;
  onLeadUpdated: (lead: Lead) => Promise<boolean>;
}) {
  const searchParams = useSearchParams()!;
  const selectedLead = useSelectedLead();
  const setSelectedLead = useSetSelectedLead();
  const closeLeadPanel = useCloseLeadPanel();
  const { mountedLead, panelOpen, clearMountedLead } =
    useMountedLeadPanel(selectedLead);
  const handlePanelClose = useLeadPanelClose();
  const { handleNavigate, currentIndex } =
    useLeadPanelHostNavigation(sortedLeads);

  useRestoreLeadPanelFromUrl({
    searchParams,
    leads,
    isRefetching,
    selectedLead,
  });

  // Keep selectedLead in sync with the list; close only when deleted and URL has no lead=.
  useEffect(() => {
    if (!selectedLead || leads.length === 0) return;

    const leadIdParam = getLiveLeadParam(searchParams);
    const updatedLead = leads.find((l) => l._id === selectedLead._id);

    if (updatedLead) {
      if (leadRowNeedsPanelResync(selectedLead, updatedLead)) {
        setSelectedLead(
          mergeLeadContactExtrasIfSame(updatedLead, selectedLead),
        );
      }
      return;
    }

    if (leadIdParam) return;

    closeLeadPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, selectedLead?._id, searchParams]);

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

  if (!mountedLead) return null;

  return (
    <LeadDetailsPanel
      lead={mountedLead}
      isOpen={panelOpen}
      users={users}
      onLeadUpdated={handleLeadUpdatedFromPanel}
      onClose={handlePanelClose}
      onExited={clearMountedLead}
      onNavigate={handleNavigate}
      hasPrevious={currentIndex > 0}
      hasNext={currentIndex < sortedLeads.length - 1}
    />
  );
}

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
  userFilterMode?: LeadFilterMode;
  countryFilterMode?: LeadFilterMode;
  statusFilterMode?: LeadFilterMode;
  sourceFilterMode?: LeadFilterMode;
}

export default function LeadsTable({
  leads = [],
  totalRows: serverTotalRows,
  pageSize: serverPageSize,
  serverPage: serverPageProp,
  onServerPageChange,
  onPageSizeChange,
  onLeadUpdated,
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
  userFilterMode = "include",
  countryFilterMode = "include",
  statusFilterMode = "include",
  sourceFilterMode = "include",
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
  // Store hooks (NOT for pagination). Do not subscribe to selectedLead here —
  // that re-renders every mounted row on panel open/close.
  const sorting = useSorting();
  const setSorting = useSetSorting();
  const storeSelectedLeads = useSelectedLeads();
  const setStoreSelectedLeads = useSetSelectedLeads();
  const isInitializedRef = useRef(false);
  const { handleRowClick } = useLeadPanelRowActions();

  // Warm the panel chunk while the table is idle so the first row click
  // does not wait on JS download/parse.
  useEffect(() => {
    void loadLeadDetailsPanel();
  }, []);

  // URL and pagination state (LOCAL ONLY - no store). When server-side, use serverPage prop so filter change shows page 1 immediately.
  const searchParams = useSearchParams()!;
  const [pageIndex, setPageIndex] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(DEFAULT_LEAD_PAGE_SIZE);
  const pageSize = isServerPagination ? (serverPageSize ?? DEFAULT_LEAD_PAGE_SIZE) : localPageSize;
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

  // DnD Kit sensors for drag and drop (distance keeps click-to-sort working)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
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

  const clearCheckboxSelection = useCallback(() => {
    setStoreSelectedLeads([]);
    onSelectionChange?.([]);
  }, [onSelectionChange, setStoreSelectedLeads]);

  // Escape clears checkbox selection on the all-leads table.
  useClearLeadSelectionOnEscape(
    displaySelectedLeads.length > 0,
    clearCheckboxSelection,
  );

  // Custom hooks
  const { sortedLeads, handleSort } = useTableSorting({
    leads,
    sortField: (stableSorting[0]?.id as SortField) || "lastActivityAt",
    sortOrder: stableSorting[0]?.desc === false ? "asc" : "desc",
    users,
    searchQuery,
    serverSorted: isServerPagination,
    onSortChange: useCallback(
      (field, order) => {
        setSorting([{ id: field, desc: order === "desc" }]);
        // New sort order is a new result universe — return to page 1.
        if (isServerPagination && onServerPageChange) {
          onServerPageChange(1);
        } else {
          setPageIndex(0);
        }
      },
      [setSorting, isServerPagination, onServerPageChange],
    ),
  });

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
    someSelected,
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

  const { columns } = useTableColumns({
    sortField: (stableSorting[0]?.id as SortField) || "lastActivityAt",
    sortOrder: stableSorting[0]?.desc === false ? "asc" : "desc",
    handleSort,
    allSelected,
    someSelected,
    selectedLeads: displaySelectedLeads,
    handleSelectAll,
    handleRowSelection,
    users,
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
          setColumnOrder(newColumnOrder, { persist: true });
          // Update table column order
          table.setColumnOrder(newColumnOrder);
        }
      }
    },
    [columnOrder, setColumnOrder, table],
  );

  const showEmptyState = sortedLeads.length === 0;

  return (
    <>
      <div className="flex flex-col h-full min-h-0 rounded-lg shadow dark:bg-gray-800 dark:text-white">
        <div className="p-4 shrink-0">
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

        <LeadsTableScroll className="min-h-0 flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SelectedLeadRowHighlight />
            <Table containerClassName="overflow-visible">
              {showEmptyState ? (
                <EmptyStateAdminLeadsTable
                  searchQuery={searchQuery}
                  filterByUser={userFilter}
                  filterByCountry={countryFilter}
                  filterByStatus={statusFilter.map((statusId) => {
                    const statusObj = statuses.find(
                      (s) => s.id === statusId || s.name === statusId,
                    );
                    return statusObj?.name ?? statusId;
                  })}
                  filterBySource={sourceFilter}
                  userFilterMode={userFilterMode}
                  countryFilterMode={countryFilterMode}
                  statusFilterMode={statusFilterMode}
                  sourceFilterMode={sourceFilterMode}
                  hasFilters={
                    userFilter.length > 0 ||
                    countryFilter.length > 0 ||
                    statusFilter.length > 0 ||
                    sourceFilter.length > 0
                  }
                  users={users}
                />
              ) : (
                <TableContent table={table} onRowClick={handleRowClick} />
              )}
            </Table>
          </DndContext>
        </LeadsTableScroll>

        <div className="shrink-0 border-t border-gray-200 px-2 py-3 dark:border-gray-700 sm:p-4">
          <TablePagination
            pageIndex={effectivePageIndex}
            pageCount={pageCount}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <LeadsTablePanelHost
        leads={leads}
        sortedLeads={sortedLeads}
        users={users}
        isRefetching={isRefetching}
        onLeadUpdated={onLeadUpdated}
      />
    </>
  );
}

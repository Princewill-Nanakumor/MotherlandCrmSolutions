// src/components/dashboardComponents/LeadsTable.tsx
"use client";

import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
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

interface LeadsTableProps {
  leads: Lead[];
  onLeadUpdated: (lead: Lead) => Promise<boolean>;
  isLoading?: boolean;
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
  onLeadUpdated,
  isLoading = false,
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

  // URL and pagination state (LOCAL ONLY - no store)
  const searchParams = useSearchParams();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  
  // Column ordering with localStorage persistence
  const { columnOrder, setColumnOrder } = useColumnOrder();
  
  // Column visibility with localStorage persistence
  const { columnVisibility, setColumnVisibility } = useColumnVisibility("adminLeadsTable");

  // DnD Kit sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // We'll define handleDragEnd after table is created

  // --- STABILIZED SORTING STATE ---
  const stableSorting = useMemo(() => {
    if (!sorting || sorting.length === 0) {
      return [{ id: "name", desc: false }];
    }
    return sorting;
  }, [sorting]);

  // Sync pageIndex with URL on mount ONLY (not on every URL change)
  useEffect(() => {
    if (isInitializedRef.current) return;

    const pageParam = searchParams.get("page");
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
    const currentPage = searchParams.get("page");
    
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

  // Update URL when page changes
  const handlePageChange = useCallback((page: number) => {
    setPageIndex(page);
    const currentPathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(page + 1));
    const newURL = `${currentPathname}?${params.toString()}`;
    window.history.replaceState({}, "", newURL);
  }, []);

  // Use props selectedLeads if provided, otherwise use store
  const displaySelectedLeads =
    selectedLeads.length > 0 ? selectedLeads : storeSelectedLeads;

  // Custom hooks
  const { sortedLeads, handleSort } = useTableSorting({
    leads,
    sortField: (stableSorting[0]?.id as SortField) || "name",
    sortOrder: stableSorting[0]?.desc ? "desc" : "asc",
    users,
    searchQuery,
    onSortChange: useCallback(
      (field, order) => {
        setSorting([{ id: field, desc: order === "desc" }]);
      },
      [setSorting]
    ),
  });

  // ⚡ Adjust pageIndex when filtered results change and current page becomes empty/out of bounds
  useEffect(() => {
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
          `${currentPathname}?${params.toString()}`
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
          `${currentPathname}?${params.toString()}`
        );
      }
    }
  }, [sortedLeads.length, pageIndex, pageSize]); // Removed filter dependencies to fix React warning

  // Memoized current page leads
  const currentPageLeads = useMemo(() => {
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedLeads.slice(startIndex, endIndex);
  }, [sortedLeads, pageIndex, pageSize]);

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

  const { columns } = useTableColumns({
    sortField: (stableSorting[0]?.id as SortField) || "name",
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
    pageIndex,
    sorting: stableSorting,
    rowSelection,
    columnOrder,
    columnVisibility,
    setSorting,
    setPageIndex: handlePageChange,
    setPageSize,
    setColumnOrder,
    setColumnVisibility,
  });

  // Handle column drag end - defined after table is created
  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
  }, [columnOrder, setColumnOrder, table]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
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
            pageIndex={pageIndex}
            totalRows={sortedLeads.length}
            tableId="adminLeadsTable"
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
            pageIndex={pageIndex}
            pageCount={table.getPageCount()}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {selectedLead && (
        <LeadDetailsPanel
          key={selectedLead._id}
          lead={selectedLead}
          isOpen={true}
          onLeadUpdated={onLeadUpdated}
          onClose={handlePanelClose}
          onNavigate={handleNavigate}
          hasPrevious={currentIndex > 0}
          hasNext={currentIndex < sortedLeads.length - 1}
        />
      )}
    </>
  );
}

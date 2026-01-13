"use client";

import {
  useReactTable,
  getPaginationRowModel,
  getCoreRowModel,
  getSortedRowModel,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { ColumnDef } from "@tanstack/react-table";

interface TableConfigurationProps {
  data: Lead[];
  columns: ColumnDef<Lead>[];
  pageSize: number;
  pageIndex: number;
  sorting: Array<{ id: string; desc: boolean }>;
  rowSelection: Record<string, boolean>;
  columnOrder: ColumnOrderState;
  columnVisibility: VisibilityState;
  setSorting: (sorting: Array<{ id: string; desc: boolean }>) => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  setColumnOrder: (columnOrder: ColumnOrderState) => void;
  setColumnVisibility: (visibility: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void;
}

export const useTableConfiguration = ({
  data,
  columns,
  pageSize,
  pageIndex,
  sorting,
  rowSelection,
  columnOrder,
  columnVisibility,
  setSorting,
  setPageIndex,
  setPageSize,
  setColumnOrder,
  setColumnVisibility,
}: TableConfigurationProps) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      pagination: { pageSize, pageIndex },
      sorting,
      rowSelection,
      columnOrder,
      columnVisibility,
    },
    onColumnOrderChange: (updater) => {
      if (typeof updater === "function") {
        const newOrder = updater(columnOrder);
        setColumnOrder(newOrder);
      } else {
        setColumnOrder(updater);
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === "function") {
        const newVisibility = updater(columnVisibility);
        setColumnVisibility(newVisibility);
      } else {
        setColumnVisibility(updater);
      }
    },
    enableRowSelection: true,
    onRowSelectionChange: () => {
      // Handled by checkbox onChange handlers
    },
    onSortingChange: (updater) => {
      if (typeof updater === "function") {
        const newSorting = updater(sorting);
        setSorting(newSorting);
      } else {
        setSorting(updater);
      }
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const newState = updater({ pageIndex, pageSize });

        // Check if TanStack Table is trying to reset to page 0 when current page is still valid
        const totalPages = Math.ceil(data.length / pageSize);
        const currentPageStillValid = pageIndex < totalPages && data.length > 0;
        const isResettingToPage0 = newState.pageIndex === 0 && pageIndex > 0;
        
        if (isResettingToPage0 && currentPageStillValid) {
          // Don't update pageIndex - keep current page
          // This prevents unnecessary pagination resets when data changes but current page is still valid
        } else if (newState.pageIndex !== pageIndex) {
          setPageIndex(newState.pageIndex);
        }

        if (newState.pageSize !== pageSize) {
          setPageSize(newState.pageSize);
        }
      } else {
        // Check if TanStack Table is trying to reset to page 0 when current page is still valid
        const totalPages = Math.ceil(data.length / pageSize);
        const currentPageStillValid = pageIndex < totalPages && data.length > 0;
        const isResettingToPage0 = updater.pageIndex === 0 && pageIndex > 0;
        
        if (isResettingToPage0 && currentPageStillValid) {
          // Don't update pageIndex - keep current page
          // This prevents unnecessary pagination resets when data changes but current page is still valid
        } else if (updater.pageIndex !== pageIndex) {
          setPageIndex(updater.pageIndex);
        }

        if (updater.pageSize !== pageSize) {
          setPageSize(updater.pageSize);
        }
      }
    },
    manualPagination: false,
    manualSorting: true,
  });

  return { table };
};

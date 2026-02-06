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
  /** When true, data is only the current page; ignore table's reset-to-page-0 (it thinks there's only one page) */
  isServerPagination?: boolean;
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
  isServerPagination = false,
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

        // With server pagination we only pass one page of data, so the table thinks there's 1 page and resets to 0. Ignore that.
        const totalPages = Math.ceil(data.length / pageSize);
        const currentPageStillValid = pageIndex < totalPages && data.length > 0;
        const isResettingToPage0 = newState.pageIndex === 0 && pageIndex > 0;
        const ignoreServerReset = isServerPagination && isResettingToPage0;

        if (isResettingToPage0 && currentPageStillValid && !isServerPagination) {
          // Client-side: don't reset when current page still valid
        } else if (ignoreServerReset) {
          // Server-side: table only has one page of data; never accept reset to 0 when we're on page > 1
        } else if (newState.pageIndex !== pageIndex) {
          setPageIndex(newState.pageIndex);
        }

        if (newState.pageSize !== pageSize) {
          setPageSize(newState.pageSize);
        }
      } else {
        const totalPages = Math.ceil(data.length / pageSize);
        const currentPageStillValid = pageIndex < totalPages && data.length > 0;
        const isResettingToPage0 = updater.pageIndex === 0 && pageIndex > 0;
        const ignoreServerReset = isServerPagination && isResettingToPage0;

        if (isResettingToPage0 && currentPageStillValid && !isServerPagination) {
        } else if (ignoreServerReset) {
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

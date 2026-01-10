// src/components/user-management/useUserTableConfiguration.tsx
"use client";

import {
  useReactTable,
  getPaginationRowModel,
  getCoreRowModel,
  getSortedRowModel,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";
import { User } from "./UserTableColumns";
import { ColumnDef } from "@tanstack/react-table";

interface UserTableConfigurationProps {
  data: User[];
  columns: ColumnDef<User>[];
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

export const useUserTableConfiguration = ({
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
}: UserTableConfigurationProps) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: "name", desc: false }], // Default to alphabetical by name
    },
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
    enableRowSelection: false, // Users table doesn't need row selection for now
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

        if (newState.pageIndex !== pageIndex) {
          setPageIndex(newState.pageIndex);
        }

        if (newState.pageSize !== pageSize) {
          setPageSize(newState.pageSize);
        }
      } else {
        if (updater.pageIndex !== pageIndex) {
          setPageIndex(updater.pageIndex);
        }

        if (updater.pageSize !== pageSize) {
          setPageSize(updater.pageSize);
        }
      }
    },
    manualPagination: false,
    manualSorting: false, // Use TanStack Table's built-in sorting
  });

  return { table };
};

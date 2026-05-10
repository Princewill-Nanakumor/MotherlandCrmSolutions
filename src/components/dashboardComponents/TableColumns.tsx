// src/components/dashboardComponents/TableColumns.tsx
"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import {
  buildCoreColumns,
  buildSelectionAndActionColumns,
  buildTimelineColumns,
  SortField,
} from "@/components/dashboardComponents/tableColumns/columnBuilders";

interface TableColumnsProps {
  sortField: SortField;
  sortOrder: "asc" | "desc";
  handleSort: (field: SortField) => void;
  allSelected: boolean;
  selectedLeads: Lead[];
  handleSelectAll: (checked: boolean) => void;
  handleRowSelection: (lead: Lead, checked: boolean) => void;
  users: User[];
  selectAllRef: React.RefObject<HTMLInputElement | null>;
  statuses?: Array<{ id: string; name: string; color?: string }>;
}

export const useTableColumns = ({
  sortField,
  sortOrder,
  handleSort,
  allSelected,
  selectedLeads,
  handleSelectAll,
  handleRowSelection,
  users,
  selectAllRef,
  statuses = [],
}: TableColumnsProps) => {
  // Get current URL params to preserve filters when navigating
  const searchParams = useSearchParams();
  const currentParams = searchParams?.toString() || "";

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      ...buildSelectionAndActionColumns({
        allSelected,
        selectedLeads,
        handleSelectAll,
        handleRowSelection,
        selectAllRef,
        currentParams,
      }),
      ...buildCoreColumns({
        sortField,
        sortOrder,
        handleSort,
        users,
        statuses,
      }),
      ...buildTimelineColumns({
        sortField,
        sortOrder,
        handleSort,
      }),
    ],
    [
      sortField,
      sortOrder,
      handleSort,
      allSelected,
      selectedLeads,
      handleSelectAll,
      handleRowSelection,
      users,
      selectAllRef,
      statuses,
      currentParams,
    ],
  );

  return { columns };
};

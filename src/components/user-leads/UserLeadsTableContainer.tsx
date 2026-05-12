// src/components/user-leads/UserLeadsTableContainer.tsx
import React from "react";
import { Lead } from "@/types/leads";
import { UserLeadTable } from "@/components/user-leads/UserLeadTable";
import UserLeadTableControls from "./UserLeadTableControls";
import { TablePagination } from "@/components/leads/TablePagination";
import { useUserLeadsTableColumns } from "./useUserLeadsTableColumns";
import { useTableConfiguration } from "@/components/dashboardComponents/TableConfiguration";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import { useMemo, useCallback } from "react";
import type { ColumnOrderState } from "@tanstack/react-table";

/** Agent leads table does not include an "Assigned To" column; strip if present from shared column-order storage. */
function columnOrderWithoutAssignedTo(order: ColumnOrderState): ColumnOrderState {
  return order.filter((id) => id !== "assignedTo");
}

type SortField =
  | "leadId"
  | "name"
  | "country"
  | "status"
  | "source"
  | "lastActivityAt"
  | "assignedTo"
  | "createdAt"
  | "statusChangedAt"
  | "lastComment"
  | "lastCommentDate"
  | "commentCount";
type SortOrder = "asc" | "desc";

interface UserLeadsTableContainerProps {
  loading: boolean;
  leads: Lead[];
  pageSize: number;
  pageIndex: number;
  totalEntries: number;
  totalPages: number;
  selectedLead: Lead | null;
  sortField: SortField;
  sortOrder: SortOrder;
  onLeadClick: (lead: Lead) => void;
  onSort: (field: SortField) => void;
  onPageSizeChange: (value: string) => void;
  onPageChange: (newPageIndex: number) => void;
}

export const UserLeadsTableContainer: React.FC<
  UserLeadsTableContainerProps
> = ({
  loading,
  leads,
  pageSize,
  pageIndex,
  totalEntries,
  totalPages,
  selectedLead,
  sortField,
  sortOrder,
  onLeadClick,
  onSort,
  onPageSizeChange,
  onPageChange,
}) => {
  // Column ordering with localStorage persistence (shared hook with all-leads; agents hide Assigned To)
  const { columnOrder: rawColumnOrder, setColumnOrder } = useColumnOrder();
  const columnOrder = useMemo(
    () => columnOrderWithoutAssignedTo(rawColumnOrder),
    [rawColumnOrder],
  );

  // Column visibility with localStorage persistence
  const { columnVisibility, setColumnVisibility } =
    useColumnVisibility("userLeadsTable");

  // Convert sortField and sortOrder to TanStack Table format
  const sorting = useMemo(() => {
    return [{ id: sortField, desc: sortOrder === "desc" }];
  }, [sortField, sortOrder]);

  // Handle sort change
  const handleSort = useCallback(
    (field: SortField) => {
      onSort(field);
    },
    [onSort],
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      onPageChange(newPageIndex);
    },
    [onPageChange],
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      onPageSizeChange(newSize.toString());
    },
    [onPageSizeChange],
  );

  // Get column definitions
  const { columns } = useUserLeadsTableColumns({
    sortField,
    sortOrder,
    handleSort,
  });

  // Configure TanStack Table (we need this to get the table instance for the controls)
  const { table } = useTableConfiguration({
    data: leads,
    columns,
    pageSize,
    pageIndex,
    sorting,
    rowSelection: {},
    columnOrder,
    columnVisibility,
    setSorting: (newSorting) => {
      // Convert TanStack sorting to our format
      if (newSorting.length > 0) {
        const sort = newSorting[0];
        onSort(sort.id as SortField);
      }
    },
    setPageIndex: handlePageChange,
    setPageSize: handlePageSizeChange,
    setColumnOrder,
    setColumnVisibility,
  });

  return (
    <div>
      <UserLeadTableControls
        pageSize={pageSize}
        pageIndex={pageIndex}
        totalEntries={totalEntries}
        onPageSizeChange={onPageSizeChange}
        table={table}
      />

      <UserLeadTable
        loading={loading}
        onLeadClick={onLeadClick}
        selectedLead={selectedLead}
        table={table}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
      />

      {totalEntries > 0 && (
        <div className="px-2 mb-4 border-t border-gray-200 dark:border-gray-700">
          <TablePagination
            pageIndex={pageIndex}
            pageCount={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

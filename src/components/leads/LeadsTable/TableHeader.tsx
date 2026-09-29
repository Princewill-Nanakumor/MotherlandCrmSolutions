// src/components/leads/LeadsTable/TableHeader.tsx
import { Table } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { ColumnVisibilityToggle } from "@/components/dashboardComponents/ColumnVisibilityToggle";
import { FilterSelect } from "@/components/dashboardComponents/leadsFilters/FilterSelect";
import {
  ALL_LEADS_PAGE_SIZE_SELECT_OPTIONS,
  leadEntriesRange,
} from "@/lib/leadPageSize";
import { Loader } from "lucide-react";

interface TableHeaderProps {
  table: Table<Lead>;
  pageSize: number;
  pageIndex: number;
  totalRows: number;
  tableId?: "adminLeadsTable" | "userLeadsTable";
  /** When set (e.g. server-side pagination), changing page size updates URL and refetches */
  onPageSizeChange?: (pageSize: number) => void;
  /** When true, show updating indicator next to entries count (e.g. filter refetch) */
  isRefetching?: boolean;
}

export function TableHeader({
  table,
  pageSize,
  pageIndex,
  totalRows,
  tableId = "adminLeadsTable",
  onPageSizeChange,
  isRefetching = false,
}: TableHeaderProps) {
  const { start: currentPageStart, end: currentPageEnd } = leadEntriesRange(
    pageIndex,
    pageSize,
    totalRows,
  );
  const totalLabel = totalRows.toLocaleString();

  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value);
    table.setPageSize(newSize);
    onPageSizeChange?.(newSize);
  };

  return (
    <div className="flex items-center justify-between gap-2 my-3 mb-4 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
        <label className="hidden text-sm font-medium text-gray-700! dark:text-white! sm:inline">
          Show
        </label>
        <FilterSelect
          value={pageSize.toString()}
          onChange={handlePageSizeChange}
          options={ALL_LEADS_PAGE_SIZE_SELECT_OPTIONS}
          placeholder={pageSize.toString()}
          className="w-20 sm:w-28"
          showActiveHighlight={false}
          ariaLabel="Rows per page"
        />
        <span className="hidden text-sm font-medium text-gray-700! dark:text-white! sm:inline">
          entries
        </span>
        <ColumnVisibilityToggle table={table} tableId={tableId} />
      </div>
      <div className="shrink-0 text-sm text-gray-700! dark:text-white! tabular-nums">
        {isRefetching ? (
          <span className="inline-flex items-center gap-1.5 text-brand">
            <Loader className="w-5 h-5 animate-spin shrink-0 brand-icon" />
            <span className="hidden sm:inline">Updating</span>
          </span>
        ) : (
          <>
            <span className="sm:hidden">
              {currentPageStart}–{currentPageEnd} of {totalLabel}
            </span>
            <span className="hidden sm:inline">
              Showing {currentPageStart} to {currentPageEnd} of {totalLabel}{" "}
              entries
            </span>
          </>
        )}
      </div>
    </div>
  );
}

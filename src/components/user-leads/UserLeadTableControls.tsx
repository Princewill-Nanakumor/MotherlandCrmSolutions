// src/components/user-leads/UserLeadTableControls.tsx
import { ColumnVisibilityToggle } from "@/components/dashboardComponents/ColumnVisibilityToggle";
import { FilterSelect } from "@/components/dashboardComponents/leadsFilters/FilterSelect";
import {
  LEAD_PAGE_SIZE_SELECT_OPTIONS,
  leadEntriesRange,
} from "@/lib/leadPageSize";
import { Table } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { Loader } from "lucide-react";

interface UserLeadTableControlsProps {
  pageSize: number;
  pageIndex: number;
  totalEntries: number;
  onPageSizeChange: (value: string) => void;
  table: Table<Lead>;
  isRefetching?: boolean;
}

export default function UserLeadTableControls({
  pageSize,
  pageIndex,
  totalEntries,
  onPageSizeChange,
  table,
  isRefetching = false,
}: UserLeadTableControlsProps) {
  const { start, end } = leadEntriesRange(pageIndex, pageSize, totalEntries);
  const totalLabel = totalEntries.toLocaleString();

  return (
    <div className="flex items-center justify-between gap-2 p-4 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0 sm:gap-2">
        <span className="hidden text-sm text-gray-600! dark:text-white! sm:inline">
          Show
        </span>
        <FilterSelect
          value={pageSize.toString()}
          onChange={onPageSizeChange}
          options={LEAD_PAGE_SIZE_SELECT_OPTIONS}
          placeholder={pageSize.toString()}
          className="w-20 sm:w-25"
          showActiveHighlight={false}
          ariaLabel="Rows per page"
        />
        <span className="hidden text-sm text-gray-600! dark:text-white! sm:inline">
          entries
        </span>
        <ColumnVisibilityToggle table={table} tableId="userLeadsTable" />
      </div>
      <div className="shrink-0 text-sm text-gray-600! dark:text-white! tabular-nums">
        {isRefetching ? (
          <span className="inline-flex items-center gap-1.5 text-brand">
            <Loader className="w-5 h-5 animate-spin shrink-0 brand-icon" />
            <span className="hidden sm:inline">Updating</span>
          </span>
        ) : totalEntries > 0 ? (
          <>
            <span className="sm:hidden">
              {start}–{end} of {totalLabel}
            </span>
            <span className="hidden sm:inline">
              Showing {start} to {end} of {totalLabel} entries
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

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

  return (
    <div className="flex flex-col gap-3 p-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 items-center min-w-0">
        <span className="text-sm text-gray-600! dark:text-white!">Show</span>
        <FilterSelect
          value={pageSize.toString()}
          onChange={onPageSizeChange}
          options={LEAD_PAGE_SIZE_SELECT_OPTIONS}
          placeholder={pageSize.toString()}
          className="w-25"
          showActiveHighlight={false}
        />
        <span className="text-sm text-gray-600! dark:text-white!">entries</span>
        <ColumnVisibilityToggle table={table} tableId="userLeadsTable" />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-600! wrap-break-word dark:text-white!">
        {isRefetching ? (
          <span className="inline-flex items-center gap-1.5 text-brand">
            <Loader className="w-5 h-5 animate-spin shrink-0 brand-icon" />
            <span>Updating</span>
          </span>
        ) : totalEntries > 0 ? (
          <span>
            Showing {start} to {end} of {totalEntries} entries
          </span>
        ) : null}
      </div>
    </div>
  );
}

// src/components/user-leads/UserLeadTableControls.tsx
import { ColumnVisibilityToggle } from "@/components/dashboardComponents/ColumnVisibilityToggle";
import { FilterSelect } from "@/components/dashboardComponents/leadsFilters/FilterSelect";
import { Table } from "@tanstack/react-table";
import { Lead } from "@/types/leads";

interface UserLeadTableControlsProps {
  pageSize: number;
  pageIndex: number;
  totalEntries: number;
  onPageSizeChange: (value: string) => void;
  table: Table<Lead>;
}

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30, 40, 50, 100, 150, 200, 250, 300];

const PAGE_SIZE_SELECT_OPTIONS = PAGE_SIZE_OPTIONS.map((size) => ({
  value: size.toString(),
  label: size.toString(),
}));

export default function UserLeadTableControls({
  pageSize,
  pageIndex,
  totalEntries,
  onPageSizeChange,
  table,
}: UserLeadTableControlsProps) {
  return (
    <div className="flex flex-col gap-3 p-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2 items-center min-w-0">
        <span className="text-sm text-gray-600! dark:text-white!">Show</span>
        <FilterSelect
          value={pageSize.toString()}
          onChange={onPageSizeChange}
          options={PAGE_SIZE_SELECT_OPTIONS}
          placeholder={pageSize.toString()}
          className="w-25"
          showActiveHighlight={false}
        />
        <span className="text-sm text-gray-600! dark:text-white!">entries</span>
        <ColumnVisibilityToggle table={table} tableId="userLeadsTable" />
      </div>
      <div className="text-sm text-gray-600! wrap-break-word dark:text-white!">
        Showing {pageIndex * pageSize + 1} to{" "}
        {Math.min((pageIndex + 1) * pageSize, totalEntries)} of {totalEntries}{" "}
        entries
      </div>
    </div>
  );
}

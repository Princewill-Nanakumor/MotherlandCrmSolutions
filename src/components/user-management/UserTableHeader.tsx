"use client";

import { Table } from "@tanstack/react-table";
import { User } from "./UserTableColumns";
import { UserColumnVisibilityToggle } from "./UserColumnVisibilityToggle";
import { FilterSelect } from "@/components/dashboardComponents/leadsFilters/FilterSelect";

interface UserTableHeaderProps {
  table: Table<User>;
  pageSize: number;
  pageIndex: number;
  totalRows: number;
}

const pageSizeOptions = [10, 15, 20, 30, 40, 50, 100];

const PAGE_SIZE_SELECT_OPTIONS = pageSizeOptions.map((size) => ({
  value: size.toString(),
  label: size.toString(),
}));

export function UserTableHeader({
  table,
  pageSize,
  pageIndex,
  totalRows,
}: UserTableHeaderProps) {
  const currentPageStart = pageIndex * pageSize + 1;
  const currentPageEnd = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex flex-col gap-3 my-3 mb-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <label className="text-sm font-medium text-gray-700! dark:text-white!">
          Show
        </label>
        <FilterSelect
          value={pageSize.toString()}
          onChange={(value) => table.setPageSize(Number(value))}
          options={PAGE_SIZE_SELECT_OPTIONS}
          placeholder={pageSize.toString()}
          className="w-25"
          showActiveHighlight={false}
        />
        <span className="text-sm font-medium text-gray-700! dark:text-white!">
          entries
        </span>
        <UserColumnVisibilityToggle table={table} />
      </div>
      <div className="text-sm text-gray-700! wrap-break-word dark:text-white!">
        Showing {currentPageStart} to {currentPageEnd} of {totalRows} entries
      </div>
    </div>
  );
}

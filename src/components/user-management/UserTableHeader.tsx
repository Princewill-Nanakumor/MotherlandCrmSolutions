// src/components/user-management/UserTableHeader.tsx
"use client";

import { Table } from "@tanstack/react-table";
import { User } from "./UserTableColumns";
import { UserColumnVisibilityToggle } from "./UserColumnVisibilityToggle";

interface UserTableHeaderProps {
  table: Table<User>;
  pageSize: number;
  pageIndex: number;
  totalRows: number;
}

const pageSizeOptions = [10, 15, 20, 30, 40, 50, 100];

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
        <select
          value={pageSize.toString()}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          className="w-20 h-10 px-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900! dark:text-white! focus:outline-none focus:ring-0 focus:border-(--brand-focus) text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size.toString()}>
              {size}
            </option>
          ))}
        </select>
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

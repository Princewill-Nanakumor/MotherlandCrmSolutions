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
    <div className="flex items-center justify-between my-3 mb-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700! dark:text-white!">
          Show
        </label>
        <select
          value={pageSize.toString()}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          className="w-20 h-8 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900! dark:text-white! focus:outline-none focus:ring-2 focus:ring-(--brand-focus) focus:border-transparent text-sm"
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
      <div className="text-sm text-gray-700! dark:text-white!">
        Showing {currentPageStart} to {currentPageEnd} of {totalRows} entries
      </div>
    </div>
  );
}

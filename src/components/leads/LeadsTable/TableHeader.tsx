// src/components/leads/LeadsTable/TableHeader.tsx
import { Table } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { ColumnVisibilityToggle } from "@/components/dashboardComponents/ColumnVisibilityToggle";

interface TableHeaderProps {
  table: Table<Lead>;
  pageSize: number;
  pageIndex: number;
  totalRows: number;
  tableId?: "adminLeadsTable" | "userLeadsTable";
}

const pageSizeOptions = [10, 15, 20, 30, 40, 50, 100, 500];

export function TableHeader({
  table,
  pageSize,
  pageIndex,
  totalRows,
  tableId = "adminLeadsTable",
}: TableHeaderProps) {
  const currentPageStart = pageIndex * pageSize + 1;
  const currentPageEnd = Math.min((pageIndex + 1) * pageSize, totalRows);

  return (
    <div className="flex justify-between items-center mb-4 my-3">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium !text-gray-700 dark:!text-white">
          Show
        </label>
        {/* Replaced Radix UI Select with simple HTML select */}
        <select
          value={pageSize.toString()}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
          className="w-[80px] h-8 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size.toString()}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-sm font-medium !text-gray-700 dark:!text-white">
          entries
        </span>
        <ColumnVisibilityToggle table={table} tableId={tableId} />
      </div>
      <div className="text-sm !text-gray-700 dark:!text-white">
        Showing {currentPageStart} to {currentPageEnd} of {totalRows} entries
      </div>
    </div>
  );
}

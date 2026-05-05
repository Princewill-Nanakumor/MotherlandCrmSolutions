// src/components/leads/LeadsTable/TableHeader.tsx
import { Table } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { ColumnVisibilityToggle } from "@/components/dashboardComponents/ColumnVisibilityToggle";
import { Loader } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const pageSizeOptions = [10, 15, 20, 30, 40, 50, 100, 150, 200, 250, 300, 500];

export function TableHeader({
  table,
  pageSize,
  pageIndex,
  totalRows,
  tableId = "adminLeadsTable",
  onPageSizeChange,
  isRefetching = false,
}: TableHeaderProps) {
  const currentPageStart = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const currentPageEnd = Math.min((pageIndex + 1) * pageSize, totalRows);

  const handlePageSizeChange = (value: string) => {
    const newSize = Number(value);
    table.setPageSize(newSize);
    onPageSizeChange?.(newSize);
  };

  return (
    <div className="flex items-center justify-between my-3 mb-4">
      <div className="flex items-center space-x-2">
        <label className="text-sm font-medium text-gray-700! dark:text-white! ">
          Show
        </label>
        <Select
          value={pageSize.toString()}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger className="w-25 bg-white dark:bg-gray-800! border-gray-300 dark:border-gray-600">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800! border-gray-200 dark:border-gray-700">
            {pageSizeOptions.map((size) => (
              <SelectItem
                key={size}
                value={size.toString()}
                className="dark:focus:bg-gray-700 dark:hover:bg-gray-700"
              >
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm font-medium text-gray-700!  dark:text-white!">
          entries
        </span>
        <ColumnVisibilityToggle table={table} tableId={tableId} />
      </div>
      <div className="flex items-center gap-2 text-sm text-gray-700! dark:text-white!">
        {isRefetching ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Updating</span>
          </span>
        ) : (
          <span>
            Showing {currentPageStart} to {currentPageEnd} of {totalRows}{" "}
            entries
          </span>
        )}
      </div>
    </div>
  );
}

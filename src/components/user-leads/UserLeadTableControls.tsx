// src/components/user-leads/UserLeadTableControls.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColumnVisibilityToggle } from "@/components/dashboardComponents/ColumnVisibilityToggle";
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

// Changed to default export
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
        <Select value={pageSize.toString()} onValueChange={onPageSizeChange}>
          <SelectTrigger className="w-25 bg-white dark:bg-gray-800! border-gray-300 dark:border-gray-600">
            <SelectValue placeholder={pageSize} />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800! border-gray-200 dark:border-gray-700">
            {PAGE_SIZE_OPTIONS.map((size) => (
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

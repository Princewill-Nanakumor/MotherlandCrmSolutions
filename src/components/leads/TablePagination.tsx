// src/components/leads/TablePagination.tsx
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface TablePaginationProps {
  pageIndex: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  pageIndex,
  pageCount,
  onPageChange,
}: TablePaginationProps) {
  return (
    <div className="flex w-full items-center justify-between px-2 mt-4">
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Page {pageIndex + 1} of {pageCount}
      </div>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(0);
          }}
          disabled={pageIndex === 0}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(pageIndex - 1);
          }}
          disabled={pageIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(pageIndex + 1);
          }}
          disabled={pageIndex >= pageCount - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(pageCount - 1);
          }}
          disabled={pageIndex >= pageCount - 1}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

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
    <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400">
        Page {pageIndex + 1} of {pageCount}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-9"
          aria-label="First page"
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
          className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-9"
          aria-label="Previous page"
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
          className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-9"
          aria-label="Next page"
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
          className="h-8 w-8 shrink-0 p-0 sm:h-9 sm:w-9"
          aria-label="Last page"
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

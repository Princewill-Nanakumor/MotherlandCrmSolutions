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

const PAGE_BTN_CLASS =
  "h-8 w-8 shrink-0 p-0 text-gray-900! border-gray-300! bg-white! hover:bg-gray-50! dark:text-gray-100! dark:border-gray-600! dark:bg-gray-800! dark:hover:bg-gray-700! sm:h-9 sm:w-9";

const PAGE_ICON_CLASS = "h-4 w-4 text-gray-900! dark:text-gray-100!";

export function TablePagination({
  pageIndex,
  pageCount,
  onPageChange,
}: TablePaginationProps) {
  const atFirst = pageIndex === 0;
  const atLast = pageIndex >= pageCount - 1;

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
          className={PAGE_BTN_CLASS}
          aria-label="First page"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(0);
          }}
          disabled={atFirst}
        >
          <ChevronsLeft className={PAGE_ICON_CLASS} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={PAGE_BTN_CLASS}
          aria-label="Previous page"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(pageIndex - 1);
          }}
          disabled={atFirst}
        >
          <ChevronLeft className={PAGE_ICON_CLASS} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={PAGE_BTN_CLASS}
          aria-label="Next page"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(pageIndex + 1);
          }}
          disabled={atLast}
        >
          <ChevronRight className={PAGE_ICON_CLASS} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={PAGE_BTN_CLASS}
          aria-label="Last page"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPageChange(pageCount - 1);
          }}
          disabled={atLast}
        >
          <ChevronsRight className={PAGE_ICON_CLASS} />
        </Button>
      </div>
    </div>
  );
}

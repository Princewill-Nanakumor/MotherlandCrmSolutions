// src/components/dashboardComponents/ColumnVisibilityToggle.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Settings2, Eye, EyeOff } from "lucide-react";
import { Lead } from "@/types/leads";
import {
  FilterScrollHint,
  FILTER_LIST_MAX_HEIGHT_CLASS,
  FILTER_SCROLL_HINT_MIN_ITEMS,
  useFilterListScrollHint,
} from "@/components/dashboardComponents/leadsFilters/FilterScrollHint";

interface ColumnVisibilityToggleProps {
  table: Table<Lead>;
  tableId: "adminLeadsTable" | "userLeadsTable";
}

const getColumnLabels = (
  tableId: "adminLeadsTable" | "userLeadsTable",
): Record<string, string> => {
  const baseLabels: Record<string, string> = {
    select: "Select",
    actions: "Actions",
    leadId: "ID",
    name: "Name",
    email: "Email",
    phone: "Phone",
    country: "Country",
    status: "Status",
    source: "Source",
    assignedTo: "Assigned To",
    createdAt: "Created At",
    lastComment: "Last Comment",
    lastCommentDate: "Last Comment Date",
    commentCount: "Timeline",
  };

  if (tableId === "userLeadsTable") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { select, ...rest } = baseLabels;
    return rest;
  }

  return baseLabels;
};

export function ColumnVisibilityToggle({
  table,
  tableId,
}: ColumnVisibilityToggleProps) {
  const columnLabels = getColumnLabels(tableId);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const toggleableColumns = useMemo(
    () =>
      table
        .getAllColumns()
        .filter((column) => column.id !== "select" && column.id !== "actions")
        .sort((a, b) => {
          if (a.id === "leadId") return -1;
          if (b.id === "leadId") return 1;
          return a.id.localeCompare(b.id);
        }),
    [table],
  );

  const { showHint, atBottom, scrollList } = useFilterListScrollHint(
    listRef,
    toggleableColumns.length,
    open,
  );

  const visibleColumnsCount = toggleableColumns.filter((column) =>
    column.getIsVisible(),
  ).length;
  const totalOptionalColumns = toggleableColumns.length;
  const listScrollable =
    toggleableColumns.length > FILTER_SCROLL_HINT_MIN_ITEMS;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 gap-2 bg-white! dark:bg-gray-800! border-gray-300! dark:border-gray-600! text-gray-900! dark:text-white! hover:bg-gray-50! dark:hover:bg-white/10!"
          title="Toggle columns"
        >
          <Settings2 className="h-4 w-4 text-gray-900! dark:text-white!" />
          <span className="hidden sm:inline text-gray-900! dark:text-white!">
            Columns
          </span>
          <span className="hidden sm:inline text-xs text-gray-600! dark:text-gray-400!">
            ({visibleColumnsCount}/{totalOptionalColumns})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="flex w-50 flex-col overflow-hidden p-0 bg-white! dark:bg-[#1f2937]! border-gray-200! dark:border-gray-700! text-gray-900! dark:text-gray-100!"
      >
        <DropdownMenuLabel className="px-2 py-1.5">
          Toggle columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div
          ref={listRef}
          className={
            listScrollable
              ? `overflow-y-auto py-1 brand-scrollbar ${FILTER_LIST_MAX_HEIGHT_CLASS}`
              : "overflow-y-auto py-1 brand-scrollbar"
          }
        >
          {toggleableColumns.map((column) => {
            const label = columnLabels[column.id] || column.id;
            const isVisible = column.getIsVisible();

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize cursor-pointer dark:focus:bg-white/10 dark:focus:text-white"
                checked={isVisible}
                onCheckedChange={(value) => {
                  const newVisibility = {
                    ...table.getState().columnVisibility,
                  };
                  if (value) {
                    delete newVisibility[column.id];
                  } else {
                    newVisibility[column.id] = false;
                  }
                  table.setColumnVisibility(newVisibility);
                }}
                disabled={column.id === "select" || column.id === "actions"}
              >
                <div className="flex items-center w-full gap-2">
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                  <span className="text-gray-900! dark:text-white!">
                    {label}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
        </div>
        <FilterScrollHint
          show={showHint}
          atBottom={atBottom}
          onScrollClick={scrollList}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

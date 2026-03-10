// src/components/dashboardComponents/ColumnVisibilityToggle.tsx
"use client";

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

interface ColumnVisibilityToggleProps {
  table: Table<Lead>;
  tableId: "adminLeadsTable" | "userLeadsTable";
}

// Column labels mapping
const getColumnLabels = (tableId: "adminLeadsTable" | "userLeadsTable"): Record<string, string> => {
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

  // Remove "select" for user leads table
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

  // Get visible columns count
  const visibleColumnsCount = table.getAllColumns().filter((column) => {
    const isVisible = column.getIsVisible();
    const isRequired = column.id === "select" || column.id === "actions";
    return isVisible && !isRequired; // Don't count required columns
  }).length;

  const totalOptionalColumns = table.getAllColumns().filter((column) => {
    return column.id !== "select" && column.id !== "actions";
  }).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 gap-2 !bg-white dark:!bg-gray-800 !border-gray-300 dark:!border-gray-600 !text-gray-900 dark:!text-white hover:!bg-gray-50 dark:hover:!bg-gray-700"
          title="Toggle columns"
        >
          <Settings2 className="h-4 w-4 !text-gray-900 dark:!text-white" />
          <span className="hidden sm:inline !text-gray-900 dark:!text-white">Columns</span>
          <span className="hidden sm:inline text-xs !text-gray-600 dark:!text-gray-400">
            ({visibleColumnsCount}/{totalOptionalColumns})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[200px] !bg-white dark:!bg-[#1f2937] !border-gray-200 dark:!border-gray-700 !text-gray-900 dark:!text-gray-100"
      >
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => {
            // Don't allow hiding required columns
            // Include all columns except select and actions
            return column.id !== "select" && column.id !== "actions";
          })
          .sort((a, b) => {
            // Sort columns to ensure consistent order: ID first, then others
            if (a.id === "leadId") return -1;
            if (b.id === "leadId") return 1;
            return a.id.localeCompare(b.id);
          })
          .map((column) => {
            const label = columnLabels[column.id] || column.id;
            const isVisible = column.getIsVisible();

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize cursor-pointer"
                checked={isVisible}
                onCheckedChange={(value) => {
                  // Use table.setColumnVisibility to ensure immediate update
                  const newVisibility = { ...table.getState().columnVisibility };
                  if (value) {
                    // Show column - remove from visibility state (undefined means visible)
                    delete newVisibility[column.id];
                  } else {
                    // Hide column - set to false
                    newVisibility[column.id] = false;
                  }
                  table.setColumnVisibility(newVisibility);
                }}
                disabled={column.id === "select" || column.id === "actions"}
              >
                <div className="flex items-center gap-2 w-full">
                  {isVisible ? (
                    <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                  <span className="!text-gray-900 dark:!text-white">{label}</span>
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs !text-gray-900 dark:!text-white"
            onClick={() => {
              // Clear all visibility state - empty object means all columns are visible
              // (undefined/false means hidden, true/not present means visible)
              table.setColumnVisibility({});
            }}
          >
            Show all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


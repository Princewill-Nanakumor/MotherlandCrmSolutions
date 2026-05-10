// src/components/user-leads/UserLeadsColumnVisibilityToggle.tsx
"use client";

import { useState } from "react";
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
import { useUserLeadsColumnVisibility } from "@/hooks/useUserLeadsColumnVisibility";
import {
  DEFAULT_USER_LEADS_COLUMN_ORDER,
  UserLeadsColumnId,
} from "@/hooks/useUserLeadsColumnOrder";

const COLUMN_LABELS: Record<UserLeadsColumnId, string> = {
  actions: "Actions",
  leadId: "ID",
  name: "Name",
  email: "Email",
  phone: "Phone",
  country: "Country",
  status: "Status",
  source: "Source",
  createdAt: "Created At",
  statusChangedAt: "Last status change",
  lastComment: "Last Comment",
  lastCommentDate: "Last Comment Date",
  commentCount: "Timeline",
};

interface UserLeadsColumnVisibilityToggleProps {
  columnOrder: UserLeadsColumnId[];
}

export function UserLeadsColumnVisibilityToggle({
  columnOrder,
}: UserLeadsColumnVisibilityToggleProps) {
  const {
    isColumnVisible,
    toggleColumnVisibility,
    showAllColumns,
    columnVisibility,
  } = useUserLeadsColumnVisibility();
  const [showAllOptions, setShowAllOptions] = useState(false);

  // Count visible columns (excluding actions)
  const visibleColumnsCount = columnOrder.filter(
    (col) => col !== "actions" && isColumnVisible(col),
  ).length;
  const totalOptionalColumns = DEFAULT_USER_LEADS_COLUMN_ORDER.filter(
    (col) => col !== "actions",
  ).length;

  // Use columnVisibility to ensure component re-renders when visibility changes
  // This ensures the UI updates immediately when toggling columns
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = columnVisibility;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 gap-2 bg-white! dark:bg-gray-800! border-gray-300! dark:border-gray-600! text-gray-900! dark:text-white! hover:bg-gray-50! dark:hover:bg-gray-700!"
          title="Toggle columns"
        >
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">Columns</span>
          <span className="hidden text-xs sm:inline text-muted-foreground">
            ({visibleColumnsCount}/{totalOptionalColumns})
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-50 bg-white dark:bg-[#1f2937]! border-gray-200! dark:border-gray-700! text-gray-900! dark:text-gray-100!"
      >
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {DEFAULT_USER_LEADS_COLUMN_ORDER.slice(
          0,
          showAllOptions ? undefined : 5,
        ).map((columnId) => {
          // Don't show actions in the toggle menu (always visible)
          if (columnId === "actions") return null;

          const label = COLUMN_LABELS[columnId];
          const isVisible = isColumnVisible(columnId);

          return (
            <DropdownMenuCheckboxItem
              key={columnId}
              className="capitalize cursor-pointer"
              checked={isVisible}
              onCheckedChange={() => {
                // Immediately update visibility
                toggleColumnVisibility(columnId);
              }}
            >
              <div className="flex items-center w-full gap-2">
                {isVisible ? (
                  <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <span>{label}</span>
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start w-full h-8 text-xs"
            onClick={() => {
              if (!showAllOptions) {
                setShowAllOptions(true);
                // When expanding, also make all columns visible
                showAllColumns();
              } else {
                // When collapsing, just hide the extra options in the list
                setShowAllOptions(false);
              }
            }}
          >
            {showAllOptions ? "Show fewer columns" : "Show all columns"}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

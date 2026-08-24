// src/components/user-management/UserColumnVisibilityToggle.tsx
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
import { User } from "./UserTableColumns";

interface UserColumnVisibilityToggleProps {
  table: Table<User>;
}

// Column labels mapping for user table
const userColumnLabels: Record<string, string> = {
  name: "Name",
  email: "Email",
  role: "Role",
  status: "Status",
  createdAt: "Created At",
  lastLogin: "Last Login",
  actions: "Actions",
};

export function UserColumnVisibilityToggle({
  table,
}: UserColumnVisibilityToggleProps) {
  // Get visible columns count (excluding actions)
  const visibleColumnsCount = table.getAllColumns().filter((column) => {
    const isVisible = column.getIsVisible();
    const isRequired = column.id === "actions";
    return isVisible && !isRequired;
  }).length;

  const totalOptionalColumns = table.getAllColumns().filter((column) => {
    return column.id !== "actions";
  }).length;

  return (
    <DropdownMenu>
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
        className="w-50 bg-white! dark:bg-[#1f2937]! border-gray-200! dark:border-gray-700! text-gray-900! dark:text-gray-100!"
      >
        <DropdownMenuLabel className="text-gray-900! dark:text-white!">
          Toggle columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => {
            // Don't allow hiding actions column
            return column.id !== "actions";
          })
          .sort((a, b) => {
            // Sort columns in a consistent order
            return a.id.localeCompare(b.id);
          })
          .map((column) => {
            const label = userColumnLabels[column.id] || column.id;
            const isVisible = column.getIsVisible();

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize cursor-pointer text-gray-900! dark:text-white! dark:focus:bg-white/10 dark:focus:text-white"
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
                disabled={column.id === "actions"}
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
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-xs text-gray-900! dark:text-white! dark:hover:bg-white/10"
            onClick={() => {
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

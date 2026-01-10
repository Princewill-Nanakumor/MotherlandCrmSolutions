// src/components/user-management/UserTableContent.tsx
"use client";

import { Table as TanstackTable, flexRender } from "@tanstack/react-table";
import { User } from "./UserTableColumns";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableUserColumnHeader } from "./DraggableUserColumnHeader";

interface UserTableContentProps {
  table: TanstackTable<User>;
  isLoading?: boolean;
  emptyMessage?: string;
}

// Loading Skeleton Components
const TableHeaderSkeleton = ({ columnCount }: { columnCount: number }) => (
  <TableHeader className="bg-gray-100 dark:bg-gray-800">
    <TableRow>
      {Array.from({ length: columnCount }).map((_, index) => (
        <TableHead
          key={`skeleton-header-${index}`}
          className={`!text-gray-700 dark:!text-gray-300 font-semibold text-left px-4`}
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
);

export function UserTableContent({
  table,
  isLoading = false,
  emptyMessage = "No users found.",
}: UserTableContentProps) {
  const columnIds = table
    .getAllColumns()
    .filter((col) => col.id !== "actions") // Actions column should not be draggable
    .map((col) => col.id);

  const generateUniqueKey = (prefix: string, id: string, suffix?: string) => {
    return `${prefix}-${id}${suffix ? `-${suffix}` : ""}`;
  };

  const showLoadingState = isLoading;
  const columnCount = table.getAllColumns().length;

  // Show skeleton when loading
  if (showLoadingState) {
    return (
      <>
        <TableHeaderSkeleton columnCount={columnCount} />
        <TableBody className="dark:bg-gray-800">
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <TableRow key={`skeleton-row-${rowIndex}`} className="animate-pulse">
              {Array.from({ length: columnCount }).map((_, colIndex) => (
                <TableCell
                  key={`skeleton-cell-${rowIndex}-${colIndex}`}
                  className="px-4 py-3.5"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </>
    );
  }

  return (
    <>
      <TableHeader className="bg-gray-100 dark:bg-gray-700 border-t">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={generateUniqueKey("header-group", headerGroup.id)}>
            <SortableContext
              items={columnIds}
              strategy={horizontalListSortingStrategy}
            >
              {headerGroup.headers.map((header) => {
                const isActionsColumn = header.column.id === "actions";
                const isStatusColumn = header.column.id === "status";
                const isRoleColumn = header.column.id === "role";
                
                return (
                  <TableHead
                    key={generateUniqueKey("header", header.id)}
                    className={`
                      !text-gray-700 dark:!text-gray-300 font-semibold
                      ${
                        isActionsColumn || isRoleColumn || isStatusColumn
                          ? "text-center"
                          : "text-left"
                      }
                      ${
                        isStatusColumn
                          ? "w-32 min-w-[120px] px-4"
                          : "px-4"
                      }
                    `}
                  >
                    {header.isPlaceholder ? null : (
                      <DraggableUserColumnHeader header={header}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </DraggableUserColumnHeader>
                    )}
                  </TableHead>
                );
              })}
            </SortableContext>
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="dark:bg-gray-800">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => {
            return (
              <TableRow
                key={row.id}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {row.getVisibleCells().map((cell) => {
                  const isStatusCell = cell.column.id === "status";
                  const isRoleCell = cell.column.id === "role";
                  const isActionsCell = cell.column.id === "actions";
                  const isCreatedAtCell = cell.column.id === "createdAt";
                  const isLastLoginCell = cell.column.id === "lastLogin";

                  return (
                    <TableCell
                      key={cell.id}
                      className={`
                        py-3.5
                        ${isActionsCell || isRoleCell || isStatusCell || isCreatedAtCell || isLastLoginCell
                          ? "text-center"
                          : "text-left"
                        }
                        ${
                          isStatusCell
                            ? "w-32 min-w-[120px] px-4"
                            : "px-4"
                        }
                      `}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell
              colSpan={table.getAllColumns().length}
              className="h-24 text-center !text-gray-600 dark:!text-gray-400 dark:bg-gray-800"
            >
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </>
  );
}

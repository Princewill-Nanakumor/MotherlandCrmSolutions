// src/components/user-leads/UserLeadsTableContent.tsx
"use client";

import { Table as TanstackTable, flexRender } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
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
import { DraggableColumnHeader } from "@/components/dashboardComponents/DraggableColumnHeader";

interface UserLeadsTableContentProps {
  table: TanstackTable<Lead>;
  onRowClick: (lead: Lead, event: React.MouseEvent) => void;
  selectedLead: Lead | null;
  isLoading?: boolean;
}

// Loading Skeleton Components
const TableHeaderSkeleton = ({ columnCount }: { columnCount: number }) => (
  <TableHeader className="bg-gray-100 dark:bg-gray-800">
    <TableRow>
      {Array.from({ length: columnCount }).map((_, index) => (
        <TableHead
          key={`skeleton-header-${index}`}
          className={`!text-gray-700 dark:!text-gray-300 font-semibold text-left ${
            index === 0
              ? "w-12 px-3 border-r border-gray-200 dark:border-gray-700"
              : "px-4"
          }`}
        >
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </TableHead>
      ))}
    </TableRow>
  </TableHeader>
);

const TableRowSkeleton = ({ columnCount }: { columnCount: number }) => (
  <TableRow className="bg-white dark:bg-gray-800">
    {Array.from({ length: columnCount }).map((_, index) => (
      <TableCell
        key={`skeleton-cell-${index}`}
        className={`
          py-3.5
          ${
            index === 0
              ? "px-3 border-r border-gray-200 dark:border-gray-700"
              : "px-4"
          }
          border-b border-gray-200 dark:border-gray-700
        `}
      >
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1"></div>
        </div>
      </TableCell>
    ))}
  </TableRow>
);

const TableSkeleton = ({
  columnCount,
  rowCount = 5,
}: {
  columnCount: number;
  rowCount?: number;
}) => (
  <>
    <TableHeaderSkeleton columnCount={columnCount} />
    <TableBody className="dark:bg-gray-800">
      {Array.from({ length: rowCount }).map((_, index) => (
        <TableRowSkeleton
          key={`skeleton-row-${index}`}
          columnCount={columnCount}
        />
      ))}
    </TableBody>
  </>
);

export function UserLeadsTableContent({
  table,
  onRowClick,
  selectedLead,
  isLoading = false,
}: UserLeadsTableContentProps) {
  const columnIds = table
    .getAllColumns()
    .filter((col) => col.id !== "select")
    .map((col) => col.id);

  const showLoadingState = isLoading;
  const columnCount = table.getAllColumns().length;

  // Show skeleton when loading
  if (showLoadingState) {
    return <TableSkeleton columnCount={columnCount} rowCount={5} />;
  }

  const generateUniqueKey = (prefix: string, id: string, suffix?: string) => {
    return `${prefix}-${id}${suffix ? `-${suffix}` : ""}`;
  };

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
                const isLastCommentColumn = header.column.id === "lastComment";
                const isCommentCountColumn = header.column.id === "commentCount";
                const isLeadIdColumn = header.column.id === "leadId";
                
                return (
                  <TableHead
                    key={generateUniqueKey("header", header.id)}
                    className={`
                      !text-gray-700 dark:!text-gray-300 font-semibold
                      ${
                        isActionsColumn || isLeadIdColumn || isCommentCountColumn
                          ? "text-center"
                          : isStatusColumn
                            ? "text-center"
                            : isLastCommentColumn
                              ? "text-center"
                              : "text-left"
                      }
                      ${
                        isStatusColumn
                          ? "w-32 min-w-[120px] px-4"
                          : isLastCommentColumn
                            ? "max-w-[200px] px-4"
                            : "px-4"
                      }
                    `}
                  >
                    {header.isPlaceholder ? null : (
                      <DraggableColumnHeader header={header}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </DraggableColumnHeader>
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
            const lead = row.original;
            const isSelected = selectedLead && lead._id === selectedLead._id;

            return (
              <TableRow
                key={row.id}
                data-state={isSelected ? "selected" : undefined}
                onClick={(event) => {
                  const firstCell = event.currentTarget.querySelector("td");
                  if (firstCell && firstCell.contains(event.target as Node)) {
                    return;
                  }
                  onRowClick(lead, event);
                }}
                className={`
                  cursor-pointer transition-colors duration-150 ease-in-out
                  ${
                    isSelected
                      ? "bg-blue-50 dark:bg-gray-600"
                      : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/80"
                  }
                `}
                style={{
                  borderLeft: isSelected
                    ? "4px solid #9333ea"
                    : "4px solid transparent",
                  borderBottom: isSelected
                    ? "2px solid #9333ea"
                    : "1px solid var(--tw-prose-invert-borders, #374151)",
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const isStatusCell = cell.column.id === "status";
                  const isLastCommentCell = cell.column.id === "lastComment";
                  const isCommentCountCell = cell.column.id === "commentCount";
                  const isActionsCell = cell.column.id === "actions";
                  const isSourceCell = cell.column.id === "source";
                  const isPhoneCell = cell.column.id === "phone";
                  const isCountryCell = cell.column.id === "country";
                  const isAssignedToCell = cell.column.id === "assignedTo";
                  const isCreatedAtCell = cell.column.id === "createdAt";
                  const isLastCommentDateCell = cell.column.id === "lastCommentDate";
                  const isLeadIdCell = cell.column.id === "leadId";
                  const isEmailCell = cell.column.id === "email";
                  
                  return (
                    <TableCell
                      key={cell.id}
                      className={`
                        py-3.5
                        ${isSelected ? "!text-gray-900 dark:!text-white" : "!text-gray-800 dark:!text-gray-300"}
                        ${
                          isActionsCell || isLeadIdCell || isCommentCountCell
                            ? "text-center"
                            : isSourceCell || isPhoneCell || isCountryCell || isAssignedToCell || isCreatedAtCell || isLastCommentCell || isLastCommentDateCell || isEmailCell
                              ? "text-center"
                              : "text-left"
                        }
                        ${
                          isStatusCell
                            ? "w-32 min-w-[120px] px-4"
                            : isLastCommentCell
                              ? "max-w-[200px] px-4"
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
              No results found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </>
  );
}


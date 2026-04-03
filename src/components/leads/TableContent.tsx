// src/components/leads/TableContent.tsx
"use client";

import { Table as TanstackTable, flexRender } from "@tanstack/react-table";
import { Lead, Status } from "@/types/leads";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableColumnHeader } from "@/components/dashboardComponents/DraggableColumnHeader";

interface TableContentProps {
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
          className={`text-gray-700 dark:text-gray-300 font-semibold text-left ${
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
          {index === 0 && (
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          )}
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

export function TableContent({
  table,
  onRowClick,
  selectedLead,
  isLoading = false,
}: TableContentProps) {
  const columnIds = table
    .getAllColumns()
    .filter((col) => col.id !== "select")
    .map((col) => col.id);
  // Use React Query for consistent status caching
  const { data: statuses = [], isLoading: isStatusLoading } = useQuery<Status[], Error>({
    queryKey: ["statuses"],
    queryFn: async (): Promise<Status[]> => {
      const response = await fetch("/api/statuses");
      if (!response.ok) throw new Error("Failed to fetch statuses");
      const data = await response.json();

      const hasNewStatus = data.some((status: Status) => status._id === "NEW");
      if (!hasNewStatus) {
        data.unshift({
          _id: "NEW",
          id: "NEW",
          name: "New",
          color: "#3B82F6",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return data.sort((a: Status, b: Status) => {
        if (a._id === "NEW") return -1;
        if (b._id === "NEW") return 1;
        return (
          new Date(b.createdAt || new Date()).getTime() -
          new Date(a.createdAt || new Date()).getTime()
        );
      });
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const getStatusStyle = (leadStatus: string) => {
    const status = statuses.find((s) => s._id === leadStatus);
    if (!status) {
      return {
        backgroundColor: "#3B82F615",
        color: "#3B82F6",
        borderColor: "#3B82F630",
      };
    }
    return {
      backgroundColor: `${status.color}15`,
      color: status.color,
      borderColor: `${status.color}30`,
    };
  };

  const renderStatus = (leadStatus: string) => {
    if (isStatusLoading) {
      return (
        <div className="min-w-0 w-full">
          <Badge
            variant="outline"
            className="flex items-center gap-1.5 dark:border-gray-700 w-full max-w-[120px] justify-center"
          >
            <Loader2 className="h-3 w-3 animate-spin dark:text-gray-400 shrink-0" />
            <span className="dark:text-gray-400 text-xs truncate">
              Loading...
            </span>
          </Badge>
        </div>
      );
    }

    const status = statuses.find((s) => s._id === leadStatus);
    const statusColor = status?.color || "#3B82F6";
    const statusName = status?.name || "New";

    return (
      <div className="min-w-0 w-full">
        <Badge
          variant="outline"
          style={{
            ...getStatusStyle(leadStatus),
            // expose status color as CSS variable for dark mode text
            "--status-color": statusColor,
          } as React.CSSProperties}
          className="flex items-center gap-1.5 dark:border-gray-700 w-full max-w-[120px] justify-center"
          title={statusName} // Tooltip for full text
        >
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: statusColor }}
          />
          <span className="text-xs truncate text-black! dark:text-[var(--status-color)]!">
            {statusName}
          </span>
        </Badge>
      </div>
    );
  };

  const generateUniqueKey = (prefix: string, id: string, suffix?: string) => {
    return `${prefix}-${id}${suffix ? `-${suffix}` : ""}`;
  };

  const showLoadingState = isLoading || isStatusLoading;
  const columnCount = table.getAllColumns().length;

  // Show skeleton when loading
  if (showLoadingState) {
    return <TableSkeleton columnCount={columnCount} rowCount={5} />;
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
                const isSelectColumn = header.column.id === "select";
                const isStatusColumn = header.column.id === "status";
                const isLastCommentColumn = header.column.id === "lastComment";
                const isCommentCountColumn =
                  header.column.id === "commentCount";
                const isActionsColumn = header.column.id === "actions";

                return (
                  <TableHead
                    key={generateUniqueKey("header", header.id)}
                    className={`text-gray-700! dark:text-gray-300! font-semibold${
                        isSelectColumn || isActionsColumn
                          ? "text-center"
                          : isCommentCountColumn
                            ? "text-center"
                            : "text-left"
                      }
                      ${
                        isSelectColumn
                          ? "w-12 px-3 border-r border-gray-200 dark:border-gray-700"
                          : isStatusColumn
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
                  const isSelectCell = cell.column.id === "select";
                  const isSourceCell = cell.column.id === "source";
                  const isPhoneCell = cell.column.id === "phone";
                  const isCountryCell = cell.column.id === "country";
                  const isAssignedToCell = cell.column.id === "assignedTo";
                  const isCreatedAtCell = cell.column.id === "createdAt";
                  const isLastCommentDateCell =
                    cell.column.id === "lastCommentDate";

                  return (
                    <TableCell
                      key={cell.id}
                      className={`
                        py-3.5
                        ${isSelected ? "text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-300"}
                        ${
                          isSelectCell || isActionsCell
                            ? "text-center"
                            : isCommentCountCell ||
                                isSourceCell ||
                                isPhoneCell ||
                                isCountryCell ||
                                isAssignedToCell ||
                                isCreatedAtCell ||
                                isLastCommentCell ||
                                isLastCommentDateCell
                              ? "text-center"
                              : "text-left"
                        }
                        ${
                          isSelectCell
                            ? "px-3 border-r border-gray-200 dark:border-gray-700"
                            : isStatusCell
                              ? "w-32 min-w-[120px] px-4"
                              : isLastCommentCell
                                ? "max-w-[200px] px-4"
                                : "px-4"
                        }
                      `}
                    >
                      {cell.column.id === "status"
                        ? renderStatus(lead.status)
                        : flexRender(
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
              className="h-24 text-center text-gray-600 dark:text-gray-400 dark:bg-gray-800"
            >
              No results found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </>
  );
}

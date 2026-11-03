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
import { useTableStatuses } from "@/hooks/useTableStatuses";
import { useVirtualizedLeadRows } from "@/hooks/useVirtualizedLeadRows";

interface UserLeadsTableContentProps {
  table: TanstackTable<Lead>;
  onRowClick: (lead: Lead, event: React.MouseEvent) => void;
  isLoading?: boolean;
}

const TableHeaderSkeleton = ({ columnCount }: { columnCount: number }) => (
  <TableHeader className="bg-gray-100 dark:bg-gray-800">
    <TableRow>
      {Array.from({ length: columnCount }).map((_, index) => (
        <TableHead
          key={`skeleton-header-${index}`}
          className={`text-gray-700! dark:text-gray-300! font-semibold text-left${
            index === 0
              ? "w-12 px-3 border-r border-gray-200 dark:border-gray-700"
              : "px-4"
          }`}
        >
          <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
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
            <div className="w-4 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
          )}
          <div className="flex-1 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
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
    <TableBody
      className="dark:bg-gray-800"
      data-testid="user-leads-table-loading"
    >
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
  isLoading = false,
}: UserLeadsTableContentProps) {
  const columnIds = table
    .getAllColumns()
    .filter((col) => col.id !== "select")
    .map((col) => col.id);

  const { isLoading: isStatusLoading } = useTableStatuses();
  const rows = table.getRowModel().rows;
  const {
    virtualize,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureElement,
  } = useVirtualizedLeadRows(rows);
  const colSpan = table.getAllColumns().length;

  const showLoadingState = isLoading || isStatusLoading;
  const columnCount = table.getAllColumns().length;
  const skeletonRows = Math.min(
    Math.max(table.getState().pagination.pageSize || 8, 5),
    12,
  );

  const generateUniqueKey = (prefix: string, id: string, suffix?: string) => {
    return `${prefix}-${id}${suffix ? `-${suffix}` : ""}`;
  };

  if (showLoadingState) {
    return <TableSkeleton columnCount={columnCount} rowCount={skeletonRows} />;
  }

  const renderDataRow = (
    row: (typeof rows)[number],
    virtualIndex?: number,
  ) => {
    const lead = row.original;

    return (
      <TableRow
        key={row.id}
        data-lead-id={lead._id}
        data-index={virtualIndex}
        ref={virtualize ? measureElement : undefined}
        onClick={(event) => {
          const target = event.target as HTMLElement | null;
          if (!target) return;

          if (
            target.closest(
              "button, a, input, textarea, select, [data-slot='checkbox'], [role='button']",
            )
          ) {
            return;
          }

          if (
            target.closest("svg") &&
            target.closest(
              "button, a, input, textarea, select, [data-slot='checkbox'], [role='button']",
            )
          ) {
            return;
          }

          onRowClick(lead, event);
        }}
        className="cursor-pointer transition-colors duration-150 ease-in-out bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/80"
        style={{
          borderLeft: "4px solid transparent",
          borderBottom: "1px solid var(--tw-prose-invert-borders, #374151)",
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
          const isLastCallInitiatedAtCell =
            cell.column.id === "lastCallInitiatedAt";
          const isLeadIdCell = cell.column.id === "leadId";
          const isEmailCell = cell.column.id === "email";

          return (
            <TableCell
              key={cell.id}
              className={`
                py-3.5
                text-gray-800! dark:text-gray-300!
                ${
                  isActionsCell || isLeadIdCell || isCommentCountCell
                    ? "text-center"
                    : isSourceCell ||
                        isPhoneCell ||
                        isCountryCell ||
                        isAssignedToCell ||
                        isCreatedAtCell ||
                        isLastCommentCell ||
                        isLastCommentDateCell ||
                        isLastCallInitiatedAtCell ||
                        isEmailCell
                      ? "text-center"
                      : "text-left"
                }
                ${
                  isStatusCell
                    ? "w-32 min-w-30 px-4"
                    : isLastCommentCell
                      ? "max-w-50 px-4"
                      : "px-4"
                }
              `}
            >
              {cell.column.id === "status" ? (
                <div className="w-full min-w-0">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ) : (
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <>
      <TableHeader className="bg-gray-100 border-t dark:bg-gray-700 sticky top-0 z-10">
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
                const isCommentCountColumn =
                  header.column.id === "commentCount";
                const isLeadIdColumn = header.column.id === "leadId";

                return (
                  <TableHead
                    key={generateUniqueKey("header", header.id)}
                    className={`group/th text-base text-gray-700! dark:text-gray-300! font-medium ${
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
                          ? "w-32 min-w-30 px-4"
                          : isLastCommentColumn
                            ? "max-w-50 px-4"
                            : "px-4"
                      }
                    `}
                  >
                    {header.isPlaceholder ? null : (
                      <DraggableColumnHeader header={header}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
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
        {rows.length ? (
          virtualize ? (
            <>
              {paddingTop > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={colSpan}
                    style={{ height: paddingTop, padding: 0, border: 0 }}
                  />
                </tr>
              ) : null}
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;
                return renderDataRow(row, virtualRow.index);
              })}
              {paddingBottom > 0 ? (
                <tr aria-hidden="true">
                  <td
                    colSpan={colSpan}
                    style={{ height: paddingBottom, padding: 0, border: 0 }}
                  />
                </tr>
              ) : null}
            </>
          ) : (
            rows.map((row) => renderDataRow(row))
          )
        ) : (
          <TableRow>
            <TableCell
              colSpan={colSpan}
              className="h-24 text-center text-gray-600! dark:text-gray-400! dark:bg-gray-800"
            >
              No results found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </>
  );
}

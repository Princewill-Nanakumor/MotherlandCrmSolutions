// src/components/user-management/UserTableDisplay.tsx
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Table } from "@/components/ui/Table";
import { User, useUserTableColumns } from "./UserTableColumns";
import { UserTableHeader } from "./UserTableHeader";
import { UserTableContent } from "./UserTableContent";
import { TablePagination } from "@/components/leads/TablePagination";
import { useUserTableConfiguration } from "./useUserTableConfiguration";
import { useUserColumnOrder } from "@/hooks/useUserColumnOrder";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface UserTableDisplayProps {
  users: User[];
  loading: boolean;
  filterActiveOnly: boolean;
  showActions: boolean;
  onDeleteUser: (user: User) => void;
  onResetPassword: (userId: string) => void;
  onViewDetails?: (user: User) => void;
  onViewCallLogs?: (user: User) => void;
  deletingUserId?: string | null;
}

export function UserTableDisplay({
  users,
  loading,
  filterActiveOnly,
  showActions,
  onDeleteUser,
  onResetPassword,
  onViewDetails,
  onViewCallLogs,
  deletingUserId = null,
}: UserTableDisplayProps) {
  // Filter users based on filterActiveOnly
  const filteredUsers = useMemo(() => {
    return filterActiveOnly
      ? users.filter((user) => user.status === "ACTIVE")
      : users;
  }, [users, filterActiveOnly]);

  // Pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(15);

  // Sorting state - default to alphabetical by name (TanStack Table format)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("userTableSort");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (error) {
          console.error("Error parsing saved sort:", error);
        }
      }
    }
    return [{ id: "name", desc: false }]; // Default to alphabetical by name
  });

  // Save sorting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("userTableSort", JSON.stringify(sorting));
  }, [sorting]);

  // Column ordering with localStorage persistence
  const { columnOrder, setColumnOrder } = useUserColumnOrder();
  
  // Column visibility with localStorage persistence
  const { columnVisibility, setColumnVisibility } = useColumnVisibility("userTable");

  // DnD Kit sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get column definitions
  const { columns } = useUserTableColumns({
    showActions,
    onViewDetails,
    onViewCallLogs,
    onResetPassword,
    onDeleteUser,
    deletingUserId,
  });

  // Configure TanStack Table
  const { table } = useUserTableConfiguration({
    data: filteredUsers,
    columns,
    pageSize,
    pageIndex,
    sorting,
    rowSelection: {}, // No row selection for now
    columnOrder,
    columnVisibility,
    setSorting,
    setPageIndex,
    setPageSize,
    setColumnOrder,
    setColumnVisibility,
  });

  // Handle column drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.findIndex((id) => id === active.id);
      const newIndex = columnOrder.findIndex((id) => id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newColumnOrder = arrayMove(columnOrder, oldIndex, newIndex);
        setColumnOrder(newColumnOrder);
        table.setColumnOrder(newColumnOrder);
      }
    }
  }, [columnOrder, setColumnOrder, table]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setPageIndex(page);
  }, []);

  const totalRows = filteredUsers.length;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
      {!loading && (
        <div className="p-4">
          <UserTableHeader
            table={table}
            pageSize={pageSize}
            pageIndex={pageIndex}
            totalRows={totalRows}
          />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <UserTableContent 
            table={table} 
            isLoading={loading}
            emptyMessage={
              filterActiveOnly
                ? "No active users found. Create your first user to get started."
                : "No users found."
            }
          />
        </Table>
      </DndContext>

      {!loading && totalRows > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <TablePagination
            pageIndex={pageIndex}
            pageCount={table.getPageCount()}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

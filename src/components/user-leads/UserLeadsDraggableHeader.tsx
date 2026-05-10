// src/components/user-leads/UserLeadsDraggableHeader.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableHead } from "@/components/ui/Table";
import { Button } from "@/components/ui/button";
import { GripVertical } from "lucide-react";
import { UserLeadsColumnId } from "@/hooks/useUserLeadsColumnOrder";

interface UserLeadsDraggableHeaderProps {
  columnId: UserLeadsColumnId;
  children: React.ReactNode;
  isSortable?: boolean;
  isSorted?: boolean;
  onSort?: () => void;
}

export function UserLeadsDraggableHeader({
  columnId,
  children,
  isSortable = false,
  isSorted = false,
  onSort,
}: UserLeadsDraggableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: columnId,
    disabled: columnId === "actions", // Don't allow dragging the actions column
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Actions column is not draggable
  if (columnId === "actions") {
    return (
      <TableHead className="text-center text-gray-900! dark:text-white!">
        <div className="flex items-center justify-center w-full h-8 font-medium cursor-pointer">
          {children}
        </div>
      </TableHead>
    );
  }

  const headerContent = isSortable ? (
    <Button
      variant="ghost"
      onClick={onSort}
      className="flex justify-center items-center h-8 text-gray-900! dark:text-white! hover:text-gray-700! dark:hover:text-gray-200! hover:bg-transparent! dark:hover:bg-transparent!"
    >
      <span
        className={`${isSorted ? "font-bold" : "font-medium"} text-gray-900! dark:text-white!`}
      >
        {children}
      </span>
    </Button>
  ) : (
    <span
      className={`block w-full font-medium text-center text-gray-900! dark:text-white!${columnId === "email" || columnId === "phone" ? "cursor-pointer" : ""}`}
    >
      {children}
    </span>
  );

  // Consistent spacing for all columns:
  // - Drag icon button: left-1 (4px from left), width ~24px (icon 16px + padding 8px)
  // - Use consistent pl-8 (32px) for all columns to create uniform gap between drag icon and content
  const consistentLeftPadding = "pl-8"; // 32px - consistent for all columns

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`text-gray-900! dark:text-white! text-center${
        columnId === "lastComment" ? "max-w-50" : ""
      }`}
    >
      <div className="relative flex items-center justify-center group min-h-10">
        <button
          {...attributes}
          {...listeners}
          className="absolute z-10 p-1 transition-opacity -translate-y-1/2 rounded opacity-0 left-1 top-1/2 cursor-grab active:cursor-grabbing group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Drag to reorder column"
        >
          <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>
        <div className={`flex justify-center w-full ${consistentLeftPadding}`}>
          {headerContent}
        </div>
      </div>
    </TableHead>
  );
}

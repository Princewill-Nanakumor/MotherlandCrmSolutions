// src/components/user-leads/UserLeadsDraggableHeader.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TableHead } from "@/components/ui/Table";
import { Button } from "@/components/ui/button";
import { GripVertical, ArrowUpDown } from "lucide-react";
import { UserLeadsColumnId } from "@/hooks/useUserLeadsColumnOrder";

interface UserLeadsDraggableHeaderProps {
  columnId: UserLeadsColumnId;
  children: React.ReactNode;
  isSortable?: boolean;
  isSorted?: boolean;
  sortOrder?: "asc" | "desc";
  onSort?: () => void;
}

export function UserLeadsDraggableHeader({
  columnId,
  children,
  isSortable = false,
  isSorted = false,
  sortOrder,
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
      <TableHead className="text-center !text-gray-900 dark:!text-white">
        <div className="flex justify-center items-center w-full h-8 font-medium cursor-pointer">
          {children}
        </div>
      </TableHead>
    );
  }

  const headerContent = isSortable ? (
    <Button
      variant="ghost"
      onClick={onSort}
      className="flex gap-1 justify-center items-center h-8 !text-gray-900 dark:!text-white hover:!text-gray-700 dark:hover:!text-gray-200 hover:bg-transparent! dark:hover:bg-transparent!"
    >
      <span className={`${isSorted ? "font-bold" : "font-medium"} text-gray-900 dark:text-white`}>{children}</span>
      <ArrowUpDown
        className={`h-4 w-4 text-gray-600 dark:text-gray-400 ${
          isSorted
            ? sortOrder === "asc"
              ? "rotate-180"
              : ""
            : ""
        }`}
      />
    </Button>
  ) : (
    <span
      className={`block w-full font-medium text-center text-gray-900 dark:text-white ${columnId === "email" || columnId === "phone" ? "cursor-pointer" : ""}`}
    >
      {children}
    </span>
  );

  // Email, phone, lastComment, and lastCommentDate columns need extra padding to prevent drag icon overlap
  const needsExtraPadding =
    columnId === "email" ||
    columnId === "phone" ||
    columnId === "lastComment" ||
    columnId === "lastCommentDate";
  const paddingClass = needsExtraPadding ? "pl-10" : "pl-8";

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`!text-gray-900 dark:!text-white text-center ${
        columnId === "lastComment" ? "max-w-[200px]" : ""
      }`}
    >
      <div className="flex relative justify-center items-center group min-h-10">
        <button
          {...attributes}
          {...listeners}
          className="absolute left-1 top-1/2 z-10 p-1 rounded opacity-0 transition-opacity -translate-y-1/2 cursor-grab active:cursor-grabbing group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Drag to reorder column"
        >
          <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>
        <div className={`flex justify-center w-full ${paddingClass}`}>
          {headerContent}
        </div>
      </div>
    </TableHead>
  );
}

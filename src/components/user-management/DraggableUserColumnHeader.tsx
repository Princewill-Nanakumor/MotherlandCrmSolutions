// src/components/user-management/DraggableUserColumnHeader.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header } from "@tanstack/react-table";
import { User } from "./UserTableColumns";
import { GripVertical } from "lucide-react";

interface DraggableUserColumnHeaderProps {
  header: Header<User, unknown>;
  children: React.ReactNode;
}

export function DraggableUserColumnHeader({
  header,
  children,
}: DraggableUserColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.column.id,
    disabled: header.column.id === "actions", // Don't allow dragging the actions column
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Don't make actions column draggable
  if (header.column.id === "actions") {
    return <>{children}</>;
  }

  // Check if column is center-aligned
  const isCenterAligned =
    header.column.id === "role" ||
    header.column.id === "status" ||
    header.column.id === "createdAt" ||
    header.column.id === "lastLogin";

  // Determine padding based on column type
  const paddingClass = isCenterAligned ? "pl-8" : "pl-6";

  return (
    <div ref={setNodeRef} style={style} className="relative group w-full">
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded absolute left-1 top-1/2 -translate-y-1/2 z-10"
        aria-label="Drag to reorder column"
      >
        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </button>
      <div
        className={`w-full ${paddingClass} flex items-center ${isCenterAligned ? "justify-center" : "justify-start"}`}
      >
        {children}
      </div>
    </div>
  );
}

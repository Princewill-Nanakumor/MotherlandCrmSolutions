// src/components/dashboardComponents/DraggableColumnHeader.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { GripVertical } from "lucide-react";

interface DraggableColumnHeaderProps {
  header: Header<Lead, unknown>;
  children: React.ReactNode;
}

export function DraggableColumnHeader({
  header,
  children,
}: DraggableColumnHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.column.id,
    disabled: header.column.id === "select", // Don't allow dragging the select column
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Don't make select column draggable
  if (header.column.id === "select") {
    return <>{children}</>;
  }

  // Check if column is center-aligned (select, actions, commentCount, source, phone, country, assignedTo, createdAt, lastComment, lastCommentDate)
  const isCenterAligned =
    header.column.id === "select" ||
    header.column.id === "actions" ||
    header.column.id === "commentCount" ||
    header.column.id === "source" ||
    header.column.id === "phone" ||
    header.column.id === "country" ||
    header.column.id === "assignedTo" ||
    header.column.id === "createdAt" ||
    header.column.id === "lastComment" ||
    header.column.id === "lastCommentDate";

  // Email, phone, lastComment, and lastCommentDate columns need extra padding to prevent drag icon overlap
  const needsExtraPadding =
    header.column.id === "email" ||
    header.column.id === "phone" ||
    header.column.id === "lastComment" ||
    header.column.id === "lastCommentDate";

  // Determine padding based on column type
  const paddingClass = needsExtraPadding
    ? "pl-10"
    : isCenterAligned
      ? "pl-8"
      : "pl-6";

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

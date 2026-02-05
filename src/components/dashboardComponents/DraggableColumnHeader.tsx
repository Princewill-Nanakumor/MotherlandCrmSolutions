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

  const isCenterAligned =
    header.column.id === "actions" ||
    header.column.id === "commentCount" ||
    header.column.id === "source" ||
    header.column.id === "country" ||
    header.column.id === "assignedTo" ||
    header.column.id === "createdAt" ||
    header.column.id === "lastComment" ||
    header.column.id === "lastCommentDate" ||
    header.column.id === "leadId";

  const isButtonHeader =
    header.column.id === "leadId" ||
    header.column.id === "name" ||
    header.column.id === "country" ||
    header.column.id === "status" ||
    header.column.id === "source" ||
    header.column.id === "assignedTo" ||
    header.column.id === "createdAt" ||
    header.column.id === "lastComment" ||
    header.column.id === "lastCommentDate" ||
    header.column.id === "commentCount";

  const leftPadding = isButtonHeader ? "pl-5" : "pl-8"; // 16px for Button headers, 32px for div headers

  return (
    <div ref={setNodeRef} style={style} className="relative w-full group">
      <button
        {...attributes}
        {...listeners}
        className="absolute p-1 transition-opacity -translate-y-1/2 rounded opacity-0 cursor-grab active:cursor-grabbing group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 left-1 top-1/2"
        aria-label="Drag to reorder column"
      >
        <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </button>
      <div
        className={`w-full ${leftPadding} flex items-center ${isCenterAligned ? "justify-center" : "justify-start"}`}
      >
        {children}
      </div>
    </div>
  );
}

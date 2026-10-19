// src/components/dashboardComponents/DraggableColumnHeader.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Header } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DraggableColumnHeaderProps {
  header: Header<Lead, unknown>;
  children: React.ReactNode;
}

const CENTER_ALIGNED_COLUMNS = new Set([
  "actions",
  "commentCount",
  "source",
  "country",
  "assignedTo",
  "createdAt",
  "statusChangedAt",
  "lastComment",
  "lastCommentDate",
  "leadId",
]);

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
    disabled: header.column.id === "select",
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (header.column.id === "select") {
    return <div className="text-base">{children}</div>;
  }

  const isCenterAligned = CENTER_ALIGNED_COLUMNS.has(header.column.id);
  const isSorted = Boolean(header.column.getIsSorted());

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative flex w-full cursor-grab items-center gap-0.5 rounded-md pl-0.5 transition-colors active:cursor-grabbing",
        isSorted
          ? "brand-tab-active"
          : "group-hover/th:bg-gray-200/90 dark:group-hover/th:bg-gray-600/70",
      )}
    >
      <span
        className="pointer-events-none shrink-0 rounded p-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover/th:opacity-100"
        aria-hidden
      >
        <GripVertical className="h-3.5 w-3.5 text-current opacity-60" />
      </span>
      <div
        className={cn(
          "flex min-w-0 flex-1 items-center text-base [&_button]:h-8 [&_button]:cursor-grab [&_button]:active:cursor-grabbing [&_button]:text-base [&_button]:rounded-none [&_button]:bg-transparent! [&_button]:hover:bg-transparent! [&_button]:dark:hover:bg-transparent!",
          isCenterAligned ? "justify-center" : "justify-start",
        )}
      >
        {children}
      </div>
    </div>
  );
}

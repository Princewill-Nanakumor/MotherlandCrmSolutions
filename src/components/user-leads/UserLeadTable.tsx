// src/components/user-leads/UserLeadTable.tsx
"use client";

import React, { useCallback } from "react";
import { Table } from "@/components/ui/Table";
import { Table as TanstackTable } from "@tanstack/react-table";
import { Lead } from "@/types/leads";
import { UserLeadsTableContent } from "./UserLeadsTableContent";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";

interface UserLeadTableProps {
  loading: boolean;
  onLeadClick: (lead: Lead) => void;
  selectedLead: Lead | null;
  table: TanstackTable<Lead>;
  columnOrder: string[];
  setColumnOrder: (
    order: string[],
    options?: { persist?: boolean },
  ) => void;
}

export function UserLeadTable({
  loading,
  onLeadClick,
  selectedLead,
  table,
  columnOrder,
  setColumnOrder,
}: UserLeadTableProps) {
  // DnD Kit sensors for drag and drop (distance keeps click-to-sort working)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle column drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.findIndex((id) => id === active.id);
      const newIndex = columnOrder.findIndex((id) => id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newColumnOrder = arrayMove(columnOrder, oldIndex, newIndex);
        setColumnOrder(newColumnOrder, { persist: true });
        // Update table column order
        table.setColumnOrder(newColumnOrder);
      }
    }
  }, [columnOrder, setColumnOrder, table]);

  // Handle row click
  const handleRowClick = useCallback((lead: Lead) => {
    onLeadClick(lead);
  }, [onLeadClick]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <UserLeadsTableContent
          table={table}
          onRowClick={handleRowClick}
          selectedLead={selectedLead}
          isLoading={loading}
        />
      </Table>
    </DndContext>
  );
}

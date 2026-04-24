// src/components/dashboardComponents/RowSelection.tsx
//Users/safeconnection/Downloads/drivecrm-main/src/components/dashboardComponents/RowSelection.tsx
"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";
import { Lead } from "@/types/leads";

interface RowSelectionProps {
  selectedLeads: Lead[];
  currentPageLeads: Lead[];
  onSelectionChange?: (leads: Lead[]) => void;
}

export const useRowSelection = ({
  selectedLeads,
  currentPageLeads,
  onSelectionChange,
}: RowSelectionProps) => {
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Memoized row selection state
  const rowSelection = useMemo(() => {
    const selection: Record<string, boolean> = {};
    selectedLeads.forEach((lead) => {
      if (lead._id) {
        selection[lead._id] = true;
      }
    });
    return selection;
  }, [selectedLeads]);

  // Memoized selection states
  const { allSelected, someSelected } = useMemo(() => {
    const allSelected =
      currentPageLeads.length > 0 &&
      currentPageLeads.every((lead) =>
        selectedLeads.some((selected) => selected._id === lead._id)
      );
    const someSelected = currentPageLeads.some((lead) =>
      selectedLeads.some((selected) => selected._id === lead._id)
    );
    return { allSelected, someSelected };
  }, [currentPageLeads, selectedLeads]);

  // Set indeterminate state on the select all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  // Stable selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;

      if (checked) {
        const newSelectedLeads = [...selectedLeads];
        currentPageLeads.forEach((lead) => {
          if (
            lead._id &&
            !selectedLeads.some((selected) => selected._id === lead._id)
          ) {
            newSelectedLeads.push(lead);
          }
        });
        onSelectionChange(newSelectedLeads);
      } else {
        const newSelectedLeads = selectedLeads.filter(
          (selected) =>
            !currentPageLeads.some((lead) => lead._id === selected._id)
        );
        onSelectionChange(newSelectedLeads);
      }
    },
    [selectedLeads, currentPageLeads, onSelectionChange]
  );

  const handleRowSelection = useCallback(
    (lead: Lead, checked: boolean) => {
      if (!onSelectionChange || !lead._id) return;

      if (checked) {
        onSelectionChange([...selectedLeads, lead]);
      } else {
        onSelectionChange(selectedLeads.filter((l) => l._id !== lead._id));
      }
    },
    [selectedLeads, onSelectionChange]
  );

  return {
    rowSelection,
    allSelected,
    someSelected,
    selectAllRef,
    handleSelectAll,
    handleRowSelection,
  };
};

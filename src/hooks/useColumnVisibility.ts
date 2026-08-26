// src/hooks/useColumnVisibility.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { VisibilityState } from "@tanstack/react-table";

const REQUIRED_VISIBLE_COLUMNS = ["select", "actions"] as const;

function withRequiredColumnsVisible(visibility: VisibilityState): VisibilityState {
  const next = { ...visibility };
  for (const id of REQUIRED_VISIBLE_COLUMNS) {
    next[id] = true;
  }
  return next;
}

// Default visibility - all columns visible; required ones stay forced on
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {};

export const useColumnVisibility = (
  tableId: "adminLeadsTable" | "userLeadsTable" | "userTable" = "adminLeadsTable",
) => {
  const storageKey =
    tableId === "adminLeadsTable"
      ? "all-leads-table-column-visibility"
      : tableId === "userLeadsTable"
        ? "user-leads-table-column-visibility"
        : "user-table-column-visibility";

  const enforceRequired = tableId === "adminLeadsTable";

  const [columnVisibility, setColumnVisibilityState] = useState<VisibilityState>(
    () => {
      if (typeof window === "undefined") return DEFAULT_COLUMN_VISIBILITY;

      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          const visibility = parsed || DEFAULT_COLUMN_VISIBILITY;
          return enforceRequired
            ? withRequiredColumnsVisible(visibility)
            : visibility;
        }
      } catch (error) {
        console.error("Error loading column visibility from localStorage:", error);
      }
      return DEFAULT_COLUMN_VISIBILITY;
    },
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch (error) {
      console.error("Error saving column visibility to localStorage:", error);
    }
  }, [columnVisibility, storageKey]);

  const setColumnVisibility = useCallback(
    (
      updater:
        | VisibilityState
        | ((prev: VisibilityState) => VisibilityState),
    ) => {
      setColumnVisibilityState((prev) => {
        const newVisibility =
          typeof updater === "function" ? updater(prev) : updater;
        return enforceRequired
          ? withRequiredColumnsVisible(newVisibility)
          : newVisibility;
      });
    },
    [enforceRequired],
  );

  return {
    columnVisibility,
    setColumnVisibility,
  };
};

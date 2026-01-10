// src/hooks/useColumnVisibility.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { VisibilityState } from "@tanstack/react-table";

// Default visibility - all columns visible except required ones stay visible
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  // Required columns (always visible) - don't need to be in the default
  // All other columns are visible by default (undefined means visible)
};

export const useColumnVisibility = (tableId: "adminLeadsTable" | "userLeadsTable" | "userTable" = "adminLeadsTable") => {
  const storageKey = tableId === "adminLeadsTable" 
    ? "all-leads-table-column-visibility"
    : tableId === "userLeadsTable"
    ? "user-leads-table-column-visibility"
    : "user-table-column-visibility";

  const [columnVisibility, setColumnVisibilityState] = useState<VisibilityState>(() => {
    if (typeof window === "undefined") return DEFAULT_COLUMN_VISIBILITY;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed || DEFAULT_COLUMN_VISIBILITY;
      }
    } catch (error) {
      console.error("Error loading column visibility from localStorage:", error);
    }
    return DEFAULT_COLUMN_VISIBILITY;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch (error) {
      console.error("Error saving column visibility to localStorage:", error);
    }
  }, [columnVisibility, storageKey]);

  const setColumnVisibility = useCallback((updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
    setColumnVisibilityState((prev) => {
      const newVisibility = typeof updater === "function" ? updater(prev) : updater;
      return newVisibility;
    });
  }, []);

  return {
    columnVisibility,
    setColumnVisibility,
  };
};


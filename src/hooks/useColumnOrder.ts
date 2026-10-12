// src/hooks/useColumnOrder.ts
"use client";

import { useState, useCallback } from "react";
import { ColumnOrderState } from "@tanstack/react-table";

const COLUMN_ORDER_STORAGE_KEY = "all-leads-table-column-order-v2";
const COLUMN_ORDER_CUSTOMIZED_KEY = "all-leads-table-column-order-customized-v2";

/** Default until the user reorders via dnd-kit (then persisted). */
export const DEFAULT_COLUMN_ORDER: ColumnOrderState = [
  "select",
  "leadId",
  "name",
  "email",
  "phone",
  "country",
  "status",
  "source",
  "assignedTo",
  "lastCommentDate",
  "createdAt",
  "statusChangedAt",
  "lastComment",
  "actions",
  "commentCount",
];

function mergeWithDefault(saved: unknown): ColumnOrderState {
  const savedOrder = Array.isArray(saved) ? (saved as string[]) : [];
  const allColumns = [...new Set([...savedOrder, ...DEFAULT_COLUMN_ORDER])];
  return allColumns.filter((col) => DEFAULT_COLUMN_ORDER.includes(col));
}

function readStoredOrder(): ColumnOrderState {
  if (typeof window === "undefined") return DEFAULT_COLUMN_ORDER;

  try {
    const customized = localStorage.getItem(COLUMN_ORDER_CUSTOMIZED_KEY);
    if (customized !== "1") {
      return DEFAULT_COLUMN_ORDER;
    }
    const saved = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!saved) return DEFAULT_COLUMN_ORDER;
    return mergeWithDefault(JSON.parse(saved));
  } catch (error) {
    console.error("Error loading column order from localStorage:", error);
    return DEFAULT_COLUMN_ORDER;
  }
}

export type SetColumnOrderOptions = {
  /** Persist only after an explicit dnd-kit reorder. */
  persist?: boolean;
};

export const useColumnOrder = () => {
  const [columnOrder, setColumnOrderState] =
    useState<ColumnOrderState>(readStoredOrder);

  const setColumnOrder = useCallback(
    (
      updater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState),
      options?: SetColumnOrderOptions,
    ) => {
      setColumnOrderState((prev) => {
        const newOrder =
          typeof updater === "function" ? updater(prev) : updater;

        if (options?.persist) {
          try {
            localStorage.setItem(
              COLUMN_ORDER_STORAGE_KEY,
              JSON.stringify(newOrder),
            );
            localStorage.setItem(COLUMN_ORDER_CUSTOMIZED_KEY, "1");
          } catch (error) {
            console.error("Error saving column order to localStorage:", error);
          }
        }

        return newOrder;
      });
    },
    [],
  );

  return {
    columnOrder,
    setColumnOrder,
  };
};

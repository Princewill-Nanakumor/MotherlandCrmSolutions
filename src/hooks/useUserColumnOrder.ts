// src/hooks/useUserColumnOrder.ts
"use client";

import { useState, useCallback } from "react";
import { ColumnOrderState } from "@tanstack/react-table";

const USER_COLUMN_ORDER_STORAGE_KEY = "user-table-column-order";

const DEFAULT_USER_COLUMN_ORDER: ColumnOrderState = [
  "name",
  "email",
  "role",
  "status",
  "createdAt",
  "lastLogin",
  "actions",
];

export const useUserColumnOrder = () => {
  const [columnOrder, setColumnOrderState] = useState<ColumnOrderState>(() => {
    if (typeof window === "undefined") return DEFAULT_USER_COLUMN_ORDER;
    
    try {
      const saved = localStorage.getItem(USER_COLUMN_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const savedOrder = Array.isArray(parsed) ? parsed : DEFAULT_USER_COLUMN_ORDER;
        const allColumns = [...new Set([...savedOrder, ...DEFAULT_USER_COLUMN_ORDER])];
        return allColumns.filter((col) => DEFAULT_USER_COLUMN_ORDER.includes(col));
      }
    } catch (error) {
      console.error("Error loading user column order from localStorage:", error);
    }
    return DEFAULT_USER_COLUMN_ORDER;
  });

  const setColumnOrder = useCallback((updater: ColumnOrderState | ((prev: ColumnOrderState) => ColumnOrderState)) => {
    setColumnOrderState((prev) => {
      const newOrder = typeof updater === "function" ? updater(prev) : updater;
      
      try {
        localStorage.setItem(USER_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
      } catch (error) {
        console.error("Error saving user column order to localStorage:", error);
      }
      
      return newOrder;
    });
  }, []);

  return {
    columnOrder,
    setColumnOrder,
  };
};

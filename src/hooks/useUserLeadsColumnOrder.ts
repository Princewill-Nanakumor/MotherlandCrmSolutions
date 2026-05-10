// src/hooks/useUserLeadsColumnOrder.ts
"use client";

import { useState, useCallback } from "react";

const USER_LEADS_COLUMN_ORDER_STORAGE_KEY = "user-leads-table-column-order";

// Default column order for user leads table
export const DEFAULT_USER_LEADS_COLUMN_ORDER = [
  "actions",
  "leadId",
  "name",
  "email",
  "phone",
  "country",
  "status",
  "source",
  "createdAt",
  "statusChangedAt",
  "lastComment",
  "lastCommentDate",
  "commentCount",
] as const;

export type UserLeadsColumnId = typeof DEFAULT_USER_LEADS_COLUMN_ORDER[number];

export const useUserLeadsColumnOrder = () => {
  const [columnOrder, setColumnOrderState] = useState<UserLeadsColumnId[]>(() => {
    if (typeof window === "undefined") return [...DEFAULT_USER_LEADS_COLUMN_ORDER];
    
    try {
      const saved = localStorage.getItem(USER_LEADS_COLUMN_ORDER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Validate and merge with defaults to ensure all columns are present
          const savedOrder = parsed.filter((col: string) => 
            DEFAULT_USER_LEADS_COLUMN_ORDER.includes(col as UserLeadsColumnId)
          );
          const allColumns = [...new Set([...savedOrder, ...DEFAULT_USER_LEADS_COLUMN_ORDER])];
          return allColumns.filter((col) => 
            DEFAULT_USER_LEADS_COLUMN_ORDER.includes(col as UserLeadsColumnId)
          ) as UserLeadsColumnId[];
        }
      }
    } catch (error) {
      console.error("Error loading user leads column order from localStorage:", error);
    }
    return [...DEFAULT_USER_LEADS_COLUMN_ORDER];
  });

  const setColumnOrder = useCallback((newOrder: UserLeadsColumnId[]) => {
    setColumnOrderState(newOrder);
    
    // Save to localStorage
    try {
      localStorage.setItem(USER_LEADS_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(newOrder));
    } catch (error) {
      console.error("Error saving user leads column order to localStorage:", error);
    }
  }, []);

  return {
    columnOrder,
    setColumnOrder,
  };
};


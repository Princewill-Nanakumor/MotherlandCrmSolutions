// src/components/importPageComponents/ImportHistorySection.tsx
"use client";
import { ImportHistoryItem } from "@/types/import";
import { ImportHistory } from "./ImportHistory";

interface ImportHistorySectionProps {
  importHistory: ImportHistoryItem[];
  onDelete: (id: string) => void;
  activeTab: string;
  isLoading?: boolean;
}

export function ImportHistorySection({
  importHistory,
  onDelete,
  activeTab,
  isLoading = false,
}: ImportHistorySectionProps) {
  if (activeTab !== "history") return null;
  return (
    <ImportHistory
      imports={importHistory}
      onDelete={onDelete}
      isLoading={isLoading}
    />
  );
}

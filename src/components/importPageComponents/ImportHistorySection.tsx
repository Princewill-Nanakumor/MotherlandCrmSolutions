// src/components/importPageComponents/ImportHistorySection.tsx
"use client";
import { ImportHistoryItem } from "@/types/import";
import { ImportHistory } from "./ImportHistory";

interface ImportHistorySectionProps {
  importHistory: ImportHistoryItem[];
  onDelete: (id: string) => void;
  activeTab: string;
}

export function ImportHistorySection({
  importHistory,
  onDelete,
  activeTab,
}: ImportHistorySectionProps) {
  if (activeTab !== "history") return null;
  return <ImportHistory imports={importHistory} onDelete={onDelete} />;
}

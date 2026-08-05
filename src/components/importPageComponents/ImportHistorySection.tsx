// src/components/importPageComponents/ImportHistorySection.tsx
"use client";
import { ImportHistoryItem } from "@/types/import";
import { ImportHistory } from "./ImportHistory";

interface ImportHistorySectionProps {
  importHistory: ImportHistoryItem[];
  onDelete: (id: string) => void;
  onExport?: (importId: string, fileName?: string) => void;
  exportingImportId?: string | null;
  activeTab: string;
  isLoading?: boolean;
  isDeleting?: boolean;
}

export function ImportHistorySection({
  importHistory,
  onDelete,
  onExport,
  exportingImportId,
  activeTab,
  isLoading = false,
  isDeleting = false,
}: ImportHistorySectionProps) {
  if (activeTab !== "history") return null;
  return (
    <ImportHistory
      imports={importHistory}
      onDelete={onDelete}
      onExport={onExport}
      exportingImportId={exportingImportId}
      isLoading={isLoading}
      isDeleting={isDeleting}
    />
  );
}

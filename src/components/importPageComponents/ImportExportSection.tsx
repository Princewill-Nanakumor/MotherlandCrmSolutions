// src/components/importPageComponents/ImportExportSection.tsx
"use client";

import { FC, useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IMPORT_EXPORT_HEADERS } from "@/lib/importExport";

const EXPORT_WAIT_DOTS = ["...", " ..", " ."] as const;

interface ImportExportSectionProps {
  onExportAll: () => void;
  isExporting: boolean;
  hasLeads: boolean;
  isCheckingLeads?: boolean;
}

export const ImportExportSection: FC<ImportExportSectionProps> = ({
  onExportAll,
  isExporting,
  hasLeads,
  isCheckingLeads = false,
}) => {
  const [dotIndex, setDotIndex] = useState(0);
  const canExport = hasLeads && !isCheckingLeads;

  useEffect(() => {
    if (!isExporting) {
      setDotIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setDotIndex((current) => (current + 1) % EXPORT_WAIT_DOTS.length);
    }, 450);

    return () => window.clearInterval(intervalId);
  }, [isExporting]);

  return (
    <div className="p-6 space-y-6">
      <Card className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900! dark:text-white!">
            <Download className="w-5 h-5" />
            Export leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600! dark:text-gray-300!">
            Download your leads as a CSV file with columns that match the import
            format. You can edit the file and upload it again on the New import
            tab.
          </p>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/40">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500! dark:text-gray-400!">
              Included columns
            </p>
            <div className="flex flex-wrap gap-2">
              {IMPORT_EXPORT_HEADERS.map((header) => (
                <span
                  key={header}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700! border border-gray-200 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200!"
                >
                  {header}
                </span>
              ))}
            </div>
          </div>

          <Button
            onClick={onExportAll}
            disabled={isExporting || !canExport}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting please wait
                <span className="inline-block w-6 text-left">
                  {EXPORT_WAIT_DOTS[dotIndex]}
                </span>
              </>
            ) : isCheckingLeads ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking leads…
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Export all leads (CSV)
              </>
            )}
          </Button>

          {!isCheckingLeads && !hasLeads ? (
            <p className="text-xs text-amber-700! dark:text-amber-400!">
              No leads to export yet. Import or add leads first.
            </p>
          ) : (
            <p className="text-xs text-gray-500! dark:text-gray-400!">
              To export a specific upload, open Import history and use the
              download button on that row.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportExportSection;

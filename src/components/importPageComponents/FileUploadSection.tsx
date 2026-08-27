// src/components/importPageComponents/FileUploadSection.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImportHistoryItem, ImportProgressState } from "@/types/import";
import { RequiredFieldsModal } from "./RequireFieldModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_LEADS_PER_IMPORT } from "@/lib/importBatchLimits";

interface UsageData {
  currentLeads: number;
  maxLeads: number;
  remainingLeads: number;
  canImport: boolean;
  isOverLimit?: boolean;
  overLimitBy?: number;
}

interface FileUploadSectionProps {
  activeTab: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  importHistory: ImportHistoryItem[];
  onDelete: (id: string) => void;
  setShowModal: (show: boolean) => void;
  missingFields: string[];
  usageData?: UsageData | null;
  usageDataLoading?: boolean;
  importProgress?: ImportProgressState | null;
}

function formatEta(ms: number | null | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null;
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

export const FileUploadSection = ({
  activeTab,
  fileInputRef,
  isLoading,
  handleFileUpload,
  usageData,
  usageDataLoading = false,
  importProgress = null,
}: FileUploadSectionProps) => {
  const [showRequiredFields, setShowRequiredFields] = useState(false);
  const router = useRouter();

  const isDisabled = Boolean(isLoading || (usageData && !usageData.canImport));
  const shouldShowSkeleton =
    usageDataLoading || (usageData === null && !usageDataLoading);

  if (activeTab !== "new") {
    return null;
  }

  const percent = importProgress?.percent ?? 0;
  const eta = formatEta(importProgress?.estimatedRemainingMs);

  return (
    <div className="px-6 pb-6 mt-4">
      {usageData && !usageData.canImport && (
        <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <span>Import Limit Reached</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-700 dark:text-red-300">
                You have reached your import limit. Upgrade your subscription to
                import more leads.
              </p>
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className="text-red-600 dark:text-red-400"
                >
                  {usageData.currentLeads.toLocaleString()}/
                  {usageData.maxLeads.toLocaleString()} Leads
                </Badge>
              </div>
              <Button
                onClick={() => router.push("/dashboard/subscription")}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-700 mt-4">
        <h3 className="font-medium mb-2 text-gray-800 dark:text-gray-100">
          Before You Import:
        </h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <li>Ensure your file is in Excel (.xlsx) or CSV format</li>
          <li>
            Maximum {MAX_LEADS_PER_IMPORT.toLocaleString()} leads per upload — split
            larger files into multiple imports
          </li>
          <li>
            Required columns: First Name, Last Name or Full Name, Email Address,
            Phone Number, Country
          </li>
          <li>Headers must be case-sensitive and match exactly</li>
          <li>
            <button
              type="button"
              onClick={() => setShowRequiredFields(true)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              View detailed requirements
            </button>
          </li>
        </ul>
      </div>

      <div className="flex items-center justify-center w-full">
        {shouldShowSkeleton ? (
          <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex flex-col items-center justify-center px-6 py-8">
              <div className="w-8 h-8 mb-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>

              <div className="space-y-2 w-full max-w-xs">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
          </div>
        ) : (
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 transition-colors
${
  isDisabled
    ? "pointer-events-none opacity-60"
    : "hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600"
}`}
          >
            <div className="flex flex-col items-center justify-center px-6 py-8">
              {isDisabled ? (
                <XCircle className="w-8 h-8 mb-4 text-gray-400 dark:text-gray-500" />
              ) : (
                <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
              )}
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">
                  {isDisabled ? "Import Disabled" : "Click to upload"}
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Excel or CSV files
              </p>
              {usageData && !usageData.canImport && (
                <p className="text-xs text-red-500 mt-2">
                  Import limit reached
                </p>
              )}
              {usageData &&
                usageData.canImport &&
                usageData.maxLeads !== -1 && (
                  <p className="text-xs text-blue-500 mt-1">
                    You can import up to{" "}
                    {usageData.remainingLeads.toLocaleString()} more leads
                  </p>
                )}
            </div>
          </label>
        )}

        <input
          id="file-upload"
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv,.txt"
          onChange={handleFileUpload}
          disabled={isDisabled || shouldShowSkeleton}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </div>

      {isLoading && (
        <div className="mt-4 w-full space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-200">
            <span className="font-medium">
              {importProgress?.importId
                ? `Import #${String(importProgress.importId).slice(-6)}`
                : "Importing…"}
            </span>
            <span className="tabular-nums text-blue-600 dark:text-blue-400">
              {percent}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              data-testid="import-job-progress"
              className="bg-blue-600 h-2.5 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${Math.max(percent, 2)}%` }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {importProgress ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div>
                <div className="text-gray-400 dark:text-gray-500">Processed</div>
                <div className="tabular-nums font-medium">
                  {importProgress.processedCount.toLocaleString()} /{" "}
                  {importProgress.recordCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400 dark:text-gray-500">Inserted</div>
                <div className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                  {importProgress.inserted.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400 dark:text-gray-500">Duplicates</div>
                <div className="tabular-nums font-medium">
                  {importProgress.duplicates.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400 dark:text-gray-500">Failed</div>
                <div className="tabular-nums font-medium text-red-600 dark:text-red-400">
                  {importProgress.errors.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-blue-600 dark:text-blue-400 text-xs">
              Preparing import job…
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Chunk{" "}
              {importProgress
                ? `${Math.min(importProgress.chunkIndex, importProgress.chunkTotal)} / ${importProgress.chunkTotal}`
                : "—"}
              {" · "}queued worker · 1,000 / stage batch
            </span>
            <span>{eta ? `Est. remaining: ${eta}` : "Calculating ETA…"}</span>
          </div>
        </div>
      )}

      <RequiredFieldsModal
        isOpen={showRequiredFields}
        onClose={() => setShowRequiredFields(false)}
      />
    </div>
  );
};

export default FileUploadSection;

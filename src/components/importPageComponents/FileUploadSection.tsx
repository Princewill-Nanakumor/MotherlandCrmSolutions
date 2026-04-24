// src/components/importPageComponents/FileUploadSection.tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImportHistoryItem } from "@/types/import";
import { RequiredFieldsModal } from "../importPageComponents/RequireFieldModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

export const FileUploadSection = ({
  activeTab,
  fileInputRef,
  isLoading,
  successMessage,
  handleFileUpload,
  usageData,
  usageDataLoading = false,
}: FileUploadSectionProps) => {
  const [showRequiredFields, setShowRequiredFields] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Show success toast and invalidate cache
  useEffect(() => {
    if (successMessage) {
      toast({
        title: "Import Success",
        description: successMessage,
        variant: "success",
      });

      // ✅ COMPREHENSIVE CACHE INVALIDATION when success message appears
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["import-usage-data"] }),
        queryClient.invalidateQueries({ queryKey: ["import-history"] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        // Invalidate any other leads-related queries
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === "leads",
        }),
      ]);
    }
  }, [successMessage, toast, queryClient]);

  // Improved loading and disabled logic
  const isDisabled = Boolean(isLoading || (usageData && !usageData.canImport));
  const shouldShowSkeleton =
    usageDataLoading || (usageData === null && !usageDataLoading);

  // Only render the file upload section when activeTab is "new"
  if (activeTab !== "new") {
    return null;
  }

  return (
    <div className="px-6 pb-6 mt-4">
      {/* Usage Limit Warning */}
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
                onClick={() =>
                  (window.location.href = "/dashboard/subscription")
                }
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
            Required columns: First Name, Last Name or Full Name, Email Address,
            Phone Number, Country
          </li>
          <li>Headers must be case-sensitive and match exactly</li>
          <li>
            <button
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
          // Loading skeleton for file upload area
          <div className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex flex-col items-center justify-center px-6 py-8">
              {/* Skeleton icon */}
              <div className="w-8 h-8 mb-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>

              {/* Skeleton text lines */}
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

      {/* Show loading bar instead of text */}
      {isLoading && (
        <div className="mt-4 w-full">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full animate-loading-bar"
              style={{ width: "100%" }}
            ></div>
          </div>
          <div className="text-center text-blue-600 dark:text-blue-400 text-xs mt-2">
            Importing, please wait...
          </div>
          <style jsx>{`
            @keyframes loading-bar {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(100%);
              }
            }
            .animate-loading-bar {
              animation: loading-bar 1.2s linear infinite;
            }
          `}</style>
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

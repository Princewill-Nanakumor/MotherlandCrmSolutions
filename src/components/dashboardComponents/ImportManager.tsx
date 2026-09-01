// src/components/dashboardComponents/ImportManager.tsx
"use client";

import { Loader2 } from "lucide-react";
import FileUploadSection from "@/components/importPageComponents/FileUploadSection";
import { ImportTabs } from "@/components/importPageComponents/ImportTabs";
import { ImportContent } from "@/components/importPageComponents/ImportContent";
import { UsageLimitsDisplay } from "@/components/importPageComponents/UsageLimitsDisplay";
import { UsageLimitsSkeleton } from "@/components/importPageComponents/UsageLimitsSkeleton";
import { ImportHistorySection } from "@/components/importPageComponents/ImportHistorySection";
import { ImportExportSection } from "@/components/importPageComponents/ImportExportSection";
import { ImportModalWrapper } from "@/components/importPageComponents/ImportModalWrapper";
import { useImportManager } from "@/hooks/useImportManager";
import { useImportUsageData } from "@/hooks/useUsageData";
import { useImportExport } from "@/hooks/useImportExport";

export const ImportManager = () => {
  const {
    session,
    status,
    fileInputRef,
    isLoading,
    error,
    successMessage,
    importProgress,
    showModal,
    activeTab,
    importHistory,
    isInitialLoading,
    missingFields,
    importLimitExceeded,
    setError,
    setShowModal,
    setActiveTab,
    setMissingFields,
    setImportLimitExceeded,
    handleFileUpload,
    handleDeleteImport,
    isDeletingImport,
  } = useImportManager();

  const {
    exportImport,
    exportAllLeads,
    exportingImportId,
    isExportingAll,
  } = useImportExport();

  // Use the import usage data hook
  const { importUsageData, isLoading: isUsageLoading } = useImportUsageData();

  // Show loading spinner only when session is loading
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <Loader2 className="h-10 w-10 animate-spin brand-icon" />
      </div>
    );
  }

  if (!session?.user || session.user.role !== "ADMIN") return null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-800 rounded">
      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:text-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <ImportContent />

          {/* Usage Limits Display - Above the tabs */}
          {activeTab === "new" && (
            <div>
              {isUsageLoading ? (
                <UsageLimitsSkeleton />
              ) : importUsageData ? (
                <UsageLimitsDisplay usageData={importUsageData} />
              ) : null}
            </div>
          )}

          <ImportTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          <FileUploadSection
            activeTab={activeTab}
            fileInputRef={fileInputRef}
            isLoading={isLoading}
            error={error}
            successMessage={successMessage}
            handleFileUpload={handleFileUpload}
            importHistory={importHistory}
            onDelete={handleDeleteImport}
            setShowModal={setShowModal}
            missingFields={missingFields}
            usageData={importUsageData}
            importProgress={importProgress}
          />

          {/* Import History Section */}
          <ImportHistorySection
            importHistory={importHistory}
            onDelete={handleDeleteImport}
            onExport={exportImport}
            exportingImportId={exportingImportId}
            activeTab={activeTab}
            isLoading={isInitialLoading}
            isDeleting={isDeletingImport}
          />

          {activeTab === "export" && (
            <ImportExportSection
              onExportAll={exportAllLeads}
              isExporting={isExportingAll}
              hasLeads={(importUsageData?.currentLeads ?? 0) > 0}
              isCheckingLeads={isUsageLoading}
            />
          )}

          {/* Modal */}
          <ImportModalWrapper
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setError(null);
              setMissingFields([]);
              setImportLimitExceeded(null);
            }}
            missingFields={missingFields}
            errorMessage={error ?? undefined}
            importLimitExceeded={importLimitExceeded}
          />
        </div>
      </div>
    </div>
  );
};

export default ImportManager;

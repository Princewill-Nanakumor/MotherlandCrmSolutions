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
import { EmailCheckSection } from "@/components/importPageComponents/EmailCheckSection";
import { ImportModalWrapper } from "@/components/importPageComponents/ImportModalWrapper";
import { useImportManager } from "@/hooks/useImportManager";
import { useImportUsageData } from "@/hooks/useUsageData";
import { useImportExport } from "@/hooks/useImportExport";
import { useEmailCheck } from "@/hooks/useEmailCheck";
import { DASHBOARD_PAGE_SHELL_CLASS } from "@/lib/dashboardPageShell";

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

  const emailCheck = useEmailCheck();

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
    <div className={DASHBOARD_PAGE_SHELL_CLASS}>
      <ImportContent />

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

      <EmailCheckSection
        activeTab={activeTab}
        fileInputRef={emailCheck.fileInputRef}
        isChecking={emailCheck.isChecking}
        error={emailCheck.error}
        result={emailCheck.result}
        handleFileUpload={emailCheck.handleFileUpload}
        clearResult={emailCheck.clearResult}
      />

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
  );
};

export default ImportManager;

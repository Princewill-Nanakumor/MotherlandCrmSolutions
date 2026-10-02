import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ProcessedLead, ImportProgressState } from "@/types/import";
import { processFile } from "@/utils/FileProcessing";
import { useImportHistory } from "./useImportHistory";
import {
  useImportMutations,
  isImportUpgradeRequiredError,
} from "./useImportMutations";
import {
  getPerImportLimitError,
} from "@/lib/importBatchLimits";
import type { ImportPageTab } from "@/components/importPageComponents/ImportTabs";

interface ImportLimitExceeded {
  attempted: number;
  allowed: number;
  remaining: number;
}

const IMPORT_TABS: ImportPageTab[] = ["new", "check", "history", "export"];

function parseImportTab(value: string | null): ImportPageTab {
  if (value && IMPORT_TABS.includes(value as ImportPageTab)) {
    return value as ImportPageTab;
  }
  return "new";
}

export const useImportManager = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importProgress, setImportProgress] =
    useState<ImportProgressState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTabState] = useState<ImportPageTab>(() =>
    parseImportTab(searchParams.get("tab")),
  );
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [importLimitExceeded, setImportLimitExceeded] =
    useState<ImportLimitExceeded | null>(null);

  const setActiveTab = useCallback(
    (tab: ImportPageTab) => {
      setActiveTabState(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "new") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const fromUrl = parseImportTab(searchParams.get("tab"));
    setActiveTabState((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  const {
    importHistory,
    isLoading: historyLoading,
    deleteImport,
    isDeleting,
    refreshImportHistory,
  } = useImportHistory();

  const { importLeads } = useImportMutations({
    refreshImportHistory,
    onImportSuccess: setSuccessMessage,
    onImportProgress: setImportProgress,
  });
  const runImportLeads = importLeads.mutateAsync;

  const handleDeleteImport = useCallback(
    async (id: string) => {
      try {
        await deleteImport(id);
      } catch (error) {
        console.error("Error deleting import:", error);
      }
    },
    [deleteImport],
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setSuccessMessage(null);
      setImportProgress(null);
      setImportLimitExceeded(null);
      setIsLoading(true);

      const handleSuccess = async (processedLeads: ProcessedLead[]) => {
        const perUploadError = getPerImportLimitError(processedLeads.length);
        if (perUploadError) {
          setError(perUploadError);
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setShowModal(true);
          return;
        }

        const usageData = queryClient.getQueryData<{
          currentLeads: number;
          maxLeads: number;
          remainingLeads: number;
          canImport: boolean;
        }>(["import-usage-data"]);

        if (usageData && !usageData.canImport) {
          setError(
            "Import limit reached. Please upgrade your subscription to import more leads.",
          );
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        if (
          usageData &&
          usageData.maxLeads !== -1 &&
          usageData.currentLeads + processedLeads.length > usageData.maxLeads
        ) {
          const attempted = processedLeads.length;
          const allowed = usageData.remainingLeads;
          const remaining = usageData.remainingLeads;

          setImportLimitExceeded({
            attempted,
            allowed,
            remaining,
          });

          setError(
            `Import would exceed your lead limit. You can only import ${remaining} more leads, but your file contains ${attempted} leads.`,
          );
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setShowModal(true);
          return;
        }

        try {
          await runImportLeads({ file, processedLeads });
        } catch (err) {
          if (isImportUpgradeRequiredError(err)) {
            setError(err.message);
          } else {
            setError(
              err instanceof Error
                ? err.message
                : "An error occurred during import",
            );
          }
        } finally {
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      await processFile(
        file,
        handleSuccess,
        (missing: string[]) => {
          setMissingFields(missing);
          setError(null);
          setShowModal(true);
        },
        (error: unknown) => {
          let errorMessage = "An error occurred";
          if (typeof error === "string") errorMessage = error;
          else if (error instanceof Error) errorMessage = error.message;
          else if (
            typeof error === "object" &&
            error !== null &&
            "message" in error
          ) {
            errorMessage = (error as { message: string }).message;
          }
          setError(errorMessage);
          setMissingFields([]);
          setShowModal(true);
        },
        () => {
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      );
    },
    [queryClient, runImportLeads],
  );

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      toast({
        title: "Unauthorized Access",
        description: "You do not have permission to view this page.",
        variant: "destructive",
      });
      router.push("/dashboard");
    } else if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, session, router, toast]);

  useEffect(() => {
    if (!successMessage) return;
    toast({
      title: "Import Success",
      description: successMessage,
      variant: "success",
    });
  }, [successMessage, toast]);

  return {
    session,
    status,
    fileInputRef,
    isLoading,
    isInitialLoading: historyLoading,
    error,
    successMessage,
    importProgress,
    showModal,
    activeTab,
    importHistory: importHistory || [],
    missingFields,
    importLimitExceeded,

    setError,
    setSuccessMessage,
    setShowModal,
    setActiveTab,
    setMissingFields,
    setImportLimitExceeded,

    handleFileUpload,
    handleDeleteImport,
    isDeletingImport: isDeleting,
  };
};

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ImportHistoryItem, ProcessedLead } from "@/types/import";
import { processFile } from "@/utils/FileProcessing";
import { useImportHistory } from "./useImportHistory";

interface ImportLimitExceeded {
  attempted: number;
  allowed: number;
  remaining: number;
}

export const useImportManager = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [importLimitExceeded, setImportLimitExceeded] =
    useState<ImportLimitExceeded | null>(null);

  // Use React Query hook for import history
  const {
    importHistory,
    isLoading: historyLoading,
    deleteImport,
    refreshImportHistory,
  } = useImportHistory();

  const waitForImportUpdate = useCallback(
    async (importId: string, maxTries = 10) => {
      for (let i = 0; i < maxTries; i++) {
        const res = await fetch("/api/imports");
        const data = await res.json();
        const record = data.imports.find(
          (imp: ImportHistoryItem) => imp._id === importId
        );
        if (record && record.status !== "new") break;
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    },
    []
  );

  const handleDeleteImport = useCallback(
    async (id: string) => {
      if (
        window.confirm(
          "Are you sure you want to delete this import history records with all leads that were imported? This action cannot be undone."
        )
      ) {
        try {
          await deleteImport(id);
          // ✅ COMPREHENSIVE CACHE INVALIDATION when deleting imports
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["import-usage-data"] }),
            queryClient.invalidateQueries({ queryKey: ["import-history"] }),
            queryClient.invalidateQueries({ queryKey: ["leads"] }),
            queryClient.invalidateQueries({ queryKey: ["users"] }),
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
            // Invalidate any other leads-related queries
            queryClient.invalidateQueries({
              predicate: (query) => query.queryKey[0] === "leads",
            }),
            // Invalidate any other users-related queries
            queryClient.invalidateQueries({
              predicate: (query) => query.queryKey[0] === "users",
            }),
          ]);
        } catch (error) {
          console.error("Error deleting import:", error);
        }
      }
    },
    [deleteImport, queryClient]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);
      setSuccessMessage(null);
      setImportLimitExceeded(null);
      setIsLoading(true);

      const handleSuccess = async (processedLeads: ProcessedLead[]) => {
        // Get current usage data from React Query cache
        const usageData = queryClient.getQueryData<{
          currentLeads: number;
          maxLeads: number;
          remainingLeads: number;
          canImport: boolean;
        }>(["import-usage-data"]);

        // Check usage limits before importing
        if (usageData && !usageData.canImport) {
          setError(
            "Import limit reached. Please upgrade your subscription to import more leads."
          );
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        // Check if import would exceed limits
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
            `Import would exceed your lead limit. You can only import ${remaining} more leads, but your file contains ${attempted} leads.`
          );
          setIsLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setShowModal(true);
          return;
        }

        try {
          const importResponse = await fetch("/api/imports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              recordCount: processedLeads.length,
              status: "New",
              successCount: 0,
              failureCount: 0,
              timestamp: Date.now(),
            }),
          });

          if (!importResponse.ok) {
            const errorData = await importResponse.json();
            if (importResponse.status === 403 && errorData.upgradeRequired) {
              setError(
                errorData.message ||
                  "Import limit reached. Please upgrade your subscription."
              );
              setIsLoading(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
            }
            throw new Error(
              errorData.message || "Failed to create import record"
            );
          }

          const importData = await importResponse.json();

          const leadsWithImportId = processedLeads.map(
            (lead: ProcessedLead) => ({
              ...lead,
              importId: importData.data._id,
              source:
                lead.source ||
                (file.type === "text/plain" || file.type === "text/csv"
                  ? "paste"
                  : "excel"),
            })
          );

          const leadsResponse = await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(leadsWithImportId),
          });

          if (!leadsResponse.ok) {
            const errorData = await leadsResponse.json();
            if (leadsResponse.status === 403 && errorData.upgradeRequired) {
              setError(
                errorData.message ||
                  "Import limit reached. Please upgrade your subscription."
              );
              setIsLoading(false);
              if (fileInputRef.current) fileInputRef.current.value = "";
              return;
            }
            throw new Error(errorData.message || "Failed to import leads");
          }

          const result = await leadsResponse.json();
          const successMsg = `Successfully imported ${result.inserted} leads (${result.duplicates} duplicates skipped)`;

          setSuccessMessage(successMsg);

          toast({
            title: "Import Success",
            description: successMsg,
            variant: "default",
          });

          // ✅ COMPREHENSIVE CACHE INVALIDATION + FORCE REFETCH
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["import-usage-data"] }),
            queryClient.invalidateQueries({ queryKey: ["import-history"] }),
            queryClient.invalidateQueries({ queryKey: ["leads"] }),
            queryClient.invalidateQueries({ queryKey: ["users"] }),
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
            // Invalidate any other leads-related queries
            queryClient.invalidateQueries({
              predicate: (query) => query.queryKey[0] === "leads",
            }),
            // Invalidate any other users-related queries
            queryClient.invalidateQueries({
              predicate: (query) => query.queryKey[0] === "users",
            }),
          ]);

          // ✅ FORCE REFETCH to update all stores and components
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ["leads"] }),
            queryClient.refetchQueries({ queryKey: ["users"] }),
            queryClient.refetchQueries({ queryKey: ["dashboard-stats"] }),
          ]);

          await waitForImportUpdate(importData.data._id);
          await refreshImportHistory();
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "An error occurred during import";
          setError(message);
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
        }
      );
    },
    [queryClient, waitForImportUpdate, refreshImportHistory, toast]
  );

  // Effects
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

  return {
    // State
    session,
    status,
    fileInputRef,
    isLoading,
    isInitialLoading: historyLoading,
    error,
    successMessage,
    showModal,
    activeTab,
    importHistory: importHistory || [],
    missingFields,
    importLimitExceeded,

    // Setters
    setError,
    setSuccessMessage,
    setShowModal,
    setActiveTab,
    setMissingFields,
    setImportLimitExceeded,

    // Handlers
    handleFileUpload,
    handleDeleteImport,
  };
};

"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { ImportHistoryItem, ProcessedLead } from "@/types/import";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

/** Thrown when API returns 403 with upgradeRequired (subscription limit). */
export class ImportUpgradeRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportUpgradeRequiredError";
  }
}

export function isImportUpgradeRequiredError(
  e: unknown,
): e is ImportUpgradeRequiredError {
  return e instanceof ImportUpgradeRequiredError;
}

export type ImportLeadsVariables = {
  file: File;
  processedLeads: ProcessedLead[];
};

export type ImportLeadsResult = {
  successMessage: string;
  inserted: number;
  duplicates: number;
};

async function waitForImportRecordStatus(
  importId: string,
  maxTries = 10,
): Promise<void> {
  for (let i = 0; i < maxTries; i++) {
    const res = await apiCallWithSessionRefresh("/api/imports", {
      cache: "no-store",
    });
    if (!res.ok) break;
    const data = await res.json();
    const record = data.imports.find(
      (imp: ImportHistoryItem) => imp._id === importId,
    );
    if (record && record.status !== "new") break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

async function invalidateAfterImport(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["import-usage-data"] }),
    queryClient.invalidateQueries({ queryKey: ["import-history"] }),
    queryClient.invalidateQueries({ queryKey: ["leads"] }),
    queryClient.invalidateQueries({ queryKey: ["users"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "leads",
    }),
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === "users",
    }),
  ]);
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["leads"] }),
    queryClient.refetchQueries({ queryKey: ["users"] }),
    queryClient.refetchQueries({ queryKey: ["dashboard-stats"] }),
  ]);
}

export interface UseImportMutationsOptions {
  refreshImportHistory: () => Promise<unknown>;
  onImportSuccess?: (message: string) => void;
}

export function useImportMutations({
  refreshImportHistory,
  onImportSuccess,
}: UseImportMutationsOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const importLeads = useMutation({
    mutationFn: async ({
      file,
      processedLeads,
    }: ImportLeadsVariables): Promise<ImportLeadsResult> => {
      const importResponse = await apiCallWithSessionRefresh("/api/imports", {
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
          throw new ImportUpgradeRequiredError(
            errorData.message ||
              "Import limit reached. Please upgrade your subscription.",
          );
        }
        throw new Error(
          errorData.message || "Failed to create import record",
        );
      }

      const importData = await importResponse.json();

      const leadsWithImportId = processedLeads.map((lead: ProcessedLead) => ({
        ...lead,
        importId: importData.data._id,
        source:
          lead.source ||
          (file.type === "text/plain" || file.type === "text/csv"
            ? "paste"
            : "excel"),
      }));

      const leadsResponse = await apiCallWithSessionRefresh("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leadsWithImportId),
      });

      if (!leadsResponse.ok) {
        const errorData = await leadsResponse.json();
        if (leadsResponse.status === 403 && errorData.upgradeRequired) {
          throw new ImportUpgradeRequiredError(
            errorData.message ||
              "Import limit reached. Please upgrade your subscription.",
          );
        }
        throw new Error(errorData.message || "Failed to import leads");
      }

      const result = await leadsResponse.json();
      const successMessage = `Successfully imported ${result.inserted} leads (${result.duplicates} duplicates skipped)`;

      await waitForImportRecordStatus(importData.data._id);

      return {
        successMessage,
        inserted: result.inserted,
        duplicates: result.duplicates,
      };
    },
    onSuccess: async (data) => {
      onImportSuccess?.(data.successMessage);
      toast({
        title: "Import Success",
        description: data.successMessage,
        variant: "default",
      });
      await invalidateAfterImport(queryClient);
      await refreshImportHistory();
    },
    onError: (error) => {
      if (isImportUpgradeRequiredError(error)) return;
      console.error("Import mutation error:", error);
    },
  });

  return {
    importLeads,
    isImporting: importLeads.isPending,
  };
}

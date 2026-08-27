"use client";

import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  ImportHistoryItem,
  ImportProgressState,
  ProcessedLead,
} from "@/types/import";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { refetchLeadFilterOptions } from "@/lib/leadFilterQueries";
import { getPerImportLimitError } from "@/lib/importBatchLimits";
import { IMPORT_CLIENT_CHUNK_SIZE } from "@/lib/importPipelineConfig";

/** @deprecated use IMPORT_CLIENT_CHUNK_SIZE from importPipelineConfig */
export { IMPORT_CLIENT_CHUNK_SIZE };

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
  errors: number;
  importId: string;
};

async function invalidateAfterImport(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["import-usage-data"] }),
    queryClient.invalidateQueries({ queryKey: ["import-history"] }),
    queryClient.invalidateQueries({ queryKey: ["leads-stats"], exact: false }),
    queryClient.invalidateQueries({
      predicate: (query) => {
        const root = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
        return (
          root === "leads" ||
          root === "users" ||
          root === "assignedLeads" ||
          root === "admin-overview"
        );
      },
    }),
  ]);
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["leads"], type: "all" }),
    queryClient.refetchQueries({ queryKey: ["users"], type: "all" }),
    queryClient.refetchQueries({
      queryKey: ["leads-stats"],
      exact: false,
      type: "all",
    }),
    refetchLeadFilterOptions(queryClient),
  ]);
}

function estimateRemainingMs(
  startedAt: number,
  processed: number,
  total: number,
): number | null {
  if (processed <= 0 || processed >= total) return null;
  const elapsed = Date.now() - startedAt;
  const rate = processed / elapsed;
  if (rate <= 0) return null;
  return Math.round((total - processed) / rate);
}

function progressFromImportDoc(
  importId: string,
  doc: ImportHistoryItem & {
    processedCount?: number;
    duplicateCount?: number;
    errorCount?: number;
    chunkTotal?: number;
    nextChunkIndex?: number;
    errorMessage?: string | null;
  },
  startedAt: number,
  chunkTotal: number,
): ImportProgressState {
  const recordCount = Number(doc.recordCount ?? 0);
  const processedCount = Number(doc.processedCount ?? 0);
  const percent =
    recordCount > 0
      ? Math.min(100, Math.round((processedCount / recordCount) * 100))
      : 0;
  const statusRaw = String(doc.status || "processing").toLowerCase();
  const status: ImportProgressState["status"] =
    statusRaw === "completed"
      ? "completed"
      : statusRaw === "failed"
        ? "failed"
        : "processing";

  return {
    importId,
    status,
    recordCount,
    processedCount,
    inserted: Number(doc.successCount ?? 0),
    duplicates: Number(doc.duplicateCount ?? 0),
    errors: Number(doc.errorCount ?? 0),
    percent: status === "completed" ? 100 : percent,
    chunkIndex: Number(doc.nextChunkIndex ?? 0),
    chunkTotal: Number(doc.chunkTotal ?? chunkTotal),
    startedAt,
    errorMessage: doc.errorMessage ?? undefined,
    estimatedRemainingMs: estimateRemainingMs(
      startedAt,
      processedCount,
      recordCount,
    ),
  };
}

async function waitForWorkerCompletion(options: {
  importId: string;
  recordCount: number;
  chunkTotal: number;
  startedAt: number;
  onImportProgress?: (p: ImportProgressState) => void;
}): Promise<ImportLeadsResult> {
  const { importId, chunkTotal, startedAt, onImportProgress } = options;
  const deadline = Date.now() + 30 * 60 * 1000; // 30 min max wait

  while (Date.now() < deadline) {
    // Keep draining while the tab is open; cron covers closed-tab case.
    await apiCallWithSessionRefresh("/api/imports/run", {
      method: "POST",
    }).catch(() => null);

    const res = await apiCallWithSessionRefresh("/api/imports", {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const doc = (data.imports || []).find(
        (imp: ImportHistoryItem) => String(imp._id) === importId,
      );
      if (doc) {
        const progress = progressFromImportDoc(
          importId,
          doc,
          startedAt,
          chunkTotal,
        );
        onImportProgress?.(progress);

        if (progress.status === "completed") {
          return {
            successMessage: `Successfully imported ${progress.inserted} leads (${progress.duplicates} duplicates skipped${progress.errors ? `, ${progress.errors} failed` : ""})`,
            inserted: progress.inserted,
            duplicates: progress.duplicates,
            errors: progress.errors,
            importId,
          };
        }
        if (progress.status === "failed") {
          throw new Error(
            progress.errorMessage || "Import job failed on the server",
          );
        }
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error("Import timed out waiting for background worker");
}

export interface UseImportMutationsOptions {
  refreshImportHistory: () => Promise<unknown>;
  onImportSuccess?: (message: string) => void;
  onImportProgress?: (progress: ImportProgressState) => void;
}

export function useImportMutations({
  refreshImportHistory,
  onImportSuccess,
  onImportProgress,
}: UseImportMutationsOptions) {
  const queryClient = useQueryClient();

  const importLeads = useMutation({
    mutationFn: async ({
      file,
      processedLeads,
    }: ImportLeadsVariables): Promise<ImportLeadsResult> => {
      const recordCount = processedLeads.length;
      const batchLimitError = getPerImportLimitError(recordCount);
      if (batchLimitError) {
        throw new Error(batchLimitError);
      }
      const startedAt = Date.now();
      const chunkSize = IMPORT_CLIENT_CHUNK_SIZE;
      const chunkTotal = Math.max(1, Math.ceil(recordCount / chunkSize));

      const importResponse = await apiCallWithSessionRefresh("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          recordCount,
          timestamp: Date.now(),
        }),
      });

      if (!importResponse.ok && importResponse.status !== 202) {
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
      const importId = String(importData.data._id);

      onImportProgress?.({
        importId,
        status: "processing",
        recordCount,
        processedCount: 0,
        inserted: 0,
        duplicates: 0,
        errors: 0,
        percent: 0,
        chunkIndex: 0,
        chunkTotal,
        startedAt,
        estimatedRemainingMs: null,
      });

      const sourceDefault =
        file.type === "text/plain" || file.type === "text/csv"
          ? "paste"
          : "excel";

      // Fast path: upload staging only (no lead writes yet).
      for (let chunkIndex = 0; chunkIndex < chunkTotal; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const slice = processedLeads.slice(start, start + chunkSize);
        const isLast = chunkIndex === chunkTotal - 1;

        const payload = slice.map((lead) => ({
          ...lead,
          importId,
          source: lead.source || sourceDefault,
        }));

        const stageResponse = await apiCallWithSessionRefresh(
          `/api/imports/${importId}/stage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leads: payload,
              chunkIndex,
              chunkTotal,
              isLast,
            }),
          },
        );

        if (!stageResponse.ok && stageResponse.status !== 202) {
          const errorData = await stageResponse.json().catch(() => ({}));
          if (stageResponse.status === 403 && errorData.upgradeRequired) {
            throw new ImportUpgradeRequiredError(
              errorData.message ||
                "Import limit reached. Please upgrade your subscription.",
            );
          }
          throw new Error(
            errorData.message ||
              errorData.error ||
              `Failed to stage chunk ${chunkIndex + 1}/${chunkTotal}`,
          );
        }

        onImportProgress?.({
          importId,
          status: "processing",
          recordCount,
          processedCount: 0,
          inserted: 0,
          duplicates: 0,
          errors: 0,
          percent: Math.round(((chunkIndex + 1) / chunkTotal) * 5), // staging = up to ~5%
          chunkIndex: chunkIndex + 1,
          chunkTotal,
          startedAt,
          estimatedRemainingMs: null,
        });
      }

      // Detached worker drains staging (also kicked by stage isLast + Netlify cron).
      return waitForWorkerCompletion({
        importId,
        recordCount,
        chunkTotal,
        startedAt,
        onImportProgress,
      });
    },
    onSuccess: async (data) => {
      onImportSuccess?.(data.successMessage);
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

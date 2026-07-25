import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { sanitizeExportFilename } from "@/lib/importExport";

function parseFilenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1].replace(/"/g, ""));
  } catch {
    return match[1].replace(/"/g, "");
  }
}

async function downloadExportResponse(
  response: Response,
  fallbackFilename: string,
): Promise<number> {
  if (!response.ok) {
    let message = "Export failed";
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename =
    parseFilenameFromDisposition(
      response.headers.get("Content-Disposition"),
    ) ?? sanitizeExportFilename(fallbackFilename);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  const text = await blob.text();
  const rowCount = Math.max(0, text.split("\n").length - 1);
  return rowCount;
}

export function useImportExport() {
  const { toast } = useToast();
  const [exportingImportId, setExportingImportId] = useState<string | null>(
    null,
  );
  const [isExportingAll, setIsExportingAll] = useState(false);

  const exportImport = useCallback(
    async (importId: string, fileName?: string) => {
      if (exportingImportId) return;
      setExportingImportId(importId);
      try {
        const response = await apiCallWithSessionRefresh(
          `/api/imports/${importId}/export`,
          { cache: "no-store" },
        );
        const base = fileName?.replace(/\.[^.]+$/, "") || "import";
        const count = await downloadExportResponse(
          response,
          `${base}-export.csv`,
        );
        if (count === 0) {
          toast({
            title: "Nothing to export",
            description: "No leads found for this import.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Export ready",
          description: `Downloaded ${count} lead${count === 1 ? "" : "s"} from this import.`,
          variant: "success",
        });
      } catch (error) {
        toast({
          title: "Export failed",
          description:
            error instanceof Error ? error.message : "Could not export import",
          variant: "destructive",
        });
      } finally {
        setExportingImportId(null);
      }
    },
    [exportingImportId, toast],
  );

  const exportAllLeads = useCallback(async () => {
    if (isExportingAll) return;
    setIsExportingAll(true);
    try {
      const response = await apiCallWithSessionRefresh("/api/imports/export", {
        cache: "no-store",
      });
      const date = new Date().toISOString().split("T")[0];
      const count = await downloadExportResponse(
        response,
        `leads-export-${date}.csv`,
      );
      if (count === 0) {
        toast({
          title: "Nothing to export",
          description: "No leads to export. Import or add leads first.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Export ready",
        description: `Downloaded ${count} lead${count === 1 ? "" : "s"}.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Could not export leads",
        variant: "destructive",
      });
    } finally {
      setIsExportingAll(false);
    }
  }, [isExportingAll, toast]);

  return {
    exportImport,
    exportAllLeads,
    exportingImportId,
    isExportingAll,
    isExporting: exportingImportId !== null || isExportingAll,
  };
}

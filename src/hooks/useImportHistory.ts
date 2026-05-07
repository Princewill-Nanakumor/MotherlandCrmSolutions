// src/hooks/useImportHistory.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { ImportHistoryItem } from "@/types/import";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

export const useImportHistory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    data: importHistory,
    isLoading,
    error,
    refetch: refreshImportHistory,
  } = useQuery<ImportHistoryItem[], Error>({
    queryKey: ["import-history"],
    queryFn: async (): Promise<ImportHistoryItem[]> => {
      const response = await apiCallWithSessionRefresh("/api/imports", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch import history");
      }
      const data = await response.json();
      return data.imports;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const deleteImportMutation = useMutation({
    mutationFn: async (importId: string) => {
      const response = await apiCallWithSessionRefresh(
        `/api/imports?id=${importId}`,
        { method: "DELETE" },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Failed to delete import record");
      }

      return result;
    },
    onSuccess: async (data, deletedImportId) => {
      queryClient.setQueryData<ImportHistoryItem[]>(
        ["import-history"],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter((item) => item._id !== deletedImportId);
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["import-usage-data"] }),
        queryClient.invalidateQueries({ queryKey: ["import-history"] }),
        queryClient.invalidateQueries({ queryKey: ["leads-stats"], exact: false }),
        queryClient.invalidateQueries({
          refetchType: "all",
          predicate: (query) => {
            const root = Array.isArray(query.queryKey)
              ? query.queryKey[0]
              : null;
            return (
              root === "leads" ||
              root === "users" ||
              root === "assignedLeads" ||
              root === "admin-overview"
            );
          },
        }),
      ]);

      // Ensure inactive tables refetch too (all-leads and leads pages may be off-screen now).
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["leads"], type: "all" }),
        queryClient.refetchQueries({ queryKey: ["assignedLeads"], type: "all" }),
        queryClient.refetchQueries({ queryKey: ["users"], type: "all" }),
        queryClient.refetchQueries({ queryKey: ["leads-stats"], type: "all" }),
      ]);

      toast({
        title: "Success",
        description:
          data?.message || "Import record and leads deleted successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete import record",
        variant: "destructive",
      });
    },
  });

  return {
    importHistory,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refreshImportHistory,
    deleteImport: deleteImportMutation.mutateAsync,
    isDeleting: deleteImportMutation.isPending,
  };
};

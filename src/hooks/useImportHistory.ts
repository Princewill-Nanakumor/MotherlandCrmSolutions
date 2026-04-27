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
    onSuccess: (data, deletedImportId) => {
      queryClient.setQueryData<ImportHistoryItem[]>(
        ["import-history"],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.filter((item) => item._id !== deletedImportId);
        },
      );

      void Promise.all([
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

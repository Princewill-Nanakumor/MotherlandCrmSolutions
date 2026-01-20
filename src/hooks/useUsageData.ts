// src/hooks/useUsageData.ts
import { useQuery } from "@tanstack/react-query";

interface ImportUsageData {
  currentLeads: number;
  maxLeads: number;
  remainingLeads: number;
  canImport: boolean;
}

interface ApiUsageData {
  canImport: boolean;
  canAddTeamMember: boolean;
  currentLeads: number;
  maxLeads: number;
  currentUsers: number;
  maxUsers: number;
  remainingLeads: number;
  remainingUsers: number;
}

export const useImportUsageData = () => {
  const {
    data: apiData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["import-usage-data"],
    queryFn: async (): Promise<ApiUsageData> => {
      const response = await fetch("/api/usage", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch usage data");
      }
      return response.json();
    },
    staleTime: 1 * 60 * 1000, // Reduced to 1 minute for more frequent updates
    cacheTime: 5 * 60 * 1000, // Reduced garbage collection time
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 2,
  });

  // Transform the API data to match the import usage interface
  const importUsageData: ImportUsageData | null = apiData
    ? {
        currentLeads: apiData.currentLeads,
        maxLeads: apiData.maxLeads,
        remainingLeads: apiData.remainingLeads,
        canImport: apiData.canImport,
      }
    : null;

  return {
    importUsageData,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refreshImportUsageData: refetch,
  };
};

// src/hooks/useUserUsageData.ts
import { useQuery } from "@tanstack/react-query";

interface UserUsageData {
  currentUsers: number;
  maxUsers: number;
  remainingUsers: number;
  canAddTeamMember: boolean;
  isOverLimit?: boolean;
  overLimitBy?: number;
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
  isOverLimit?: boolean;
  overLimitBy?: number;
}

// Fetch function outside the hook to prevent recreation
const fetchUsageData = async (): Promise<ApiUsageData> => {
  const response = await fetch("/api/usage");
  if (!response.ok) {
    throw new Error("Failed to fetch usage data");
  }
  return response.json();
};

export const useUserUsageData = () => {
  const {
    data: apiData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user-usage-data"],
    queryFn: fetchUsageData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true, // Only enable if needed
  });

  // Transform the API data to match the user usage interface
  const userUsageData: UserUsageData | null = apiData
    ? {
        currentUsers: apiData.currentUsers,
        maxUsers: apiData.maxUsers,
        remainingUsers: apiData.remainingUsers,
        canAddTeamMember: apiData.canAddTeamMember,
        isOverLimit: apiData.isOverLimit,
        overLimitBy: apiData.overLimitBy,
      }
    : null;

  return {
    userUsageData,
    isLoading,
    error,
    refreshUserUsageData: refetch,
  };
};

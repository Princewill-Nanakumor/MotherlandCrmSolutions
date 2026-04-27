import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/user.types";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

type StatusItem = {
  id: string;
  name: string;
  color?: string;
};

type UseLeadsLookupQueriesParams = {
  isAuthenticated: boolean;
};

export function useLeadsLookupQueries({
  isAuthenticated,
}: UseLeadsLookupQueriesParams) {
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await apiCallWithSessionRefresh("/api/users", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  const {
    data: statuses = [],
    isLoading: isLoadingStatuses,
    error: statusesError,
    refetch: refetchStatuses,
  } = useQuery({
    queryKey: ["statuses"],
    queryFn: async (): Promise<StatusItem[]> => {
      const response = await apiCallWithSessionRefresh("/api/statuses", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch statuses");
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    refetchOnMount: false,
  });

  return {
    users,
    isLoadingUsers,
    usersError,
    refetchUsers,
    statuses,
    isLoadingStatuses,
    statusesError,
    refetchStatuses,
  };
}

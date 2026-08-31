import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/user.types";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { useStatuses } from "@/context/StatusContext";

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
    statuses,
    isLoading: isLoadingStatuses,
    error: statusesError,
    refreshStatuses: refetchStatuses,
  } = useStatuses();

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

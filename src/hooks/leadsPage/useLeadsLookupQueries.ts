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
    data: users,
    isLoading: isLoadingUsers,
    isFetching: isFetchingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await apiCallWithSessionRefresh("/api/users", {
        cache: "no-store",
        timeoutMs: 15_000,
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return Array.isArray(data) ? data : data.users || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
    refetchOnMount: false,
    refetchOnReconnect: true,
    placeholderData: (previous) => previous,
  });

  const {
    statuses,
    isLoading: isLoadingStatuses,
    error: statusesError,
    refreshStatuses: refetchStatuses,
  } = useStatuses();

  return {
    users: users ?? [],
    isLoadingUsers,
    isFetchingUsers,
    usersError,
    refetchUsers,
    statuses,
    isLoadingStatuses,
    statusesError,
    refetchStatuses,
  };
}

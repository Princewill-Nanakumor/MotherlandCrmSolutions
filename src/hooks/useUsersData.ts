// src/hooks/useUsersData.ts
import { useQuery } from "@tanstack/react-query";
import { User } from "@/components/user-management/UserTableColumns";

const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch("/api/users", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.users || [];
};

export const useUsersData = () => {
  return useQuery<User[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: undefined, // Don't use placeholder data - show loading state instead
  });
};

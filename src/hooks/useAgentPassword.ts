"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

export type AgentPasswordResult =
  | { available: true; password: string }
  | { available: false; message: string };

const fetchAgentPassword = async (
  userId: string,
): Promise<AgentPasswordResult> => {
  const res = await apiCallWithSessionRefresh(`/api/users/${userId}/password`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Failed to load password");
  }

  if (data?.available && typeof data.password === "string") {
    return { available: true, password: data.password };
  }

  return {
    available: false,
    message:
      data?.message ||
      "This agent's password is not recoverable. Use Reset Password to set a new one.",
  };
};

/**
 * Fetches an agent's login password on demand.
 * Pass `enabled` to control when the request runs (e.g. after the admin clicks
 * "Show password"). Results are cached per user so reopening the modal won't
 * refetch unless the cache goes stale.
 */
export const useAgentPassword = (userId: string, enabled: boolean) => {
  return useQuery<AgentPasswordResult, Error>({
    queryKey: ["agent-password", userId],
    queryFn: () => fetchAgentPassword(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

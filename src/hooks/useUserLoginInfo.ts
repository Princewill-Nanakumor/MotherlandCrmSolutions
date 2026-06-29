"use client";

import { useQuery } from "@tanstack/react-query";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

export interface UserLoginInfo {
  ip: string | null;
  country: string | null;
  countryCode: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  at: string | null;
}

export interface UserLoginInfoResponse {
  lastLogin: string | null;
  loginInfo: UserLoginInfo | null;
}

const fetchUserLoginInfo = async (
  userId: string,
): Promise<UserLoginInfoResponse> => {
  const res = await apiCallWithSessionRefresh(
    `/api/users/${userId}/login-info`,
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || "Failed to load login information");
  }

  return {
    lastLogin: data?.lastLogin ?? null,
    loginInfo: data?.loginInfo ?? null,
  };
};

/**
 * Fetches a user's most recent login context (device, OS, browser, country,
 * time). Cached per user so reopening the modal won't refetch unless stale.
 */
export const useUserLoginInfo = (userId: string, enabled: boolean) => {
  return useQuery<UserLoginInfoResponse, Error>({
    queryKey: ["user-login-info", userId],
    queryFn: () => fetchUserLoginInfo(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

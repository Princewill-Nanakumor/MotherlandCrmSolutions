"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

interface CurrentUserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  canViewPhoneNumbers: boolean;
  canViewEmails: boolean;
}

const fetchCurrentUser = async (): Promise<CurrentUserData> => {
  const response = await fetch("/api/users/me", {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch current user data");
  }

  const data = await response.json();
  return {
    id: data.id,
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email,
    phoneNumber: data.phoneNumber || "",
    country: data.country || "",
    role: data.role || "AGENT",
    status: data.status || "ACTIVE",
    permissions: data.permissions || [],
    canViewPhoneNumbers: data.canViewPhoneNumbers ?? false,
    canViewEmails: data.canViewEmails ?? false,
  };
};

/**
 * Hook to get the current logged-in user's canViewPhoneNumbers permission
 * Fetches from API instead of session, so it stays up-to-date when database changes
 */
export const useCurrentUserPermission = () => {
  const { data: session, status } = useSession();

  const {
    data: currentUser,
    isLoading,
    error,
  } = useQuery<CurrentUserData, Error>({
    queryKey: ["current-user-permission", session?.user?.id ?? "anonymous"],
    queryFn: fetchCurrentUser,
    enabled: hasAuthorizedSession(status, session),
    staleTime: 30 * 1000, // 30 seconds - refresh more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnMount: "always",
  });

  // Prefer live /me flags; fall back to JWT while the first fetch is in flight
  // so a role flip + refresh does not flash/stick as masked incorrectly.
  const canViewPhoneNumbers =
    currentUser?.role === "ADMIN" ||
    (currentUser?.canViewPhoneNumbers ??
      session?.user?.canViewPhoneNumbers ??
      false);
  const canViewEmails =
    currentUser?.role === "ADMIN" ||
    (currentUser?.canViewEmails ?? session?.user?.canViewEmails ?? false);

  return {
    canViewPhoneNumbers,
    canViewEmails,
    isLoading,
    error,
    currentUser,
  };
};

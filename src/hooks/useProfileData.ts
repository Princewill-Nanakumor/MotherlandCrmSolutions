// src/hooks/useProfileData.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
}

// Fetch function outside the hook to prevent recreation
const fetchProfile = async (): Promise<UserProfile> => {
  const response = await fetch("/api/users/me", {
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

// Update function
const updateProfile = async ({
  id,
  changes,
}: {
  id: string;
  changes: Partial<UserProfile>;
}): Promise<UserProfile> => {
  const response = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(changes),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error ||
        errorData.message ||
        `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

export const useProfileData = () => {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile, Error>({
    queryKey: ["profile-data"],
    queryFn: fetchProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!session?.user,
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (updatedProfile) => {
      // Update the cache with new data
      queryClient.setQueryData(["profile-data"], updatedProfile);

      // Update session
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phoneNumber: updatedProfile.phoneNumber,
          country: updatedProfile.country,
          role: updatedProfile.role,
          status: updatedProfile.status,
          permissions: updatedProfile.permissions,
        },
      });
    },
    onError: (error) => {
      console.error("Error updating profile:", error);
    },
  });

  return {
    profile,
    isLoading,
    error,
    refreshProfile: refetch,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
  };
};

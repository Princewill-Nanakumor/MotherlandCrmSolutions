// src/hooks/useNavbarData.ts
import { useQuery } from "@tanstack/react-query";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  balance: number;
  status: string;
  /** Mirrors JWT / middleware: ADMIN and email in SUPER_ADMIN_EMAILS. */
  isSuperAdmin?: boolean;
}


const fetchUserProfile = async (): Promise<UserProfile> => {
  const response = await apiCallWithSessionRefresh("/api/user/profile", {
    cache: "no-store",
  });

  if (response.status === 404) {
    console.log("User not found, signing out...");
    await signOutWithoutInterstitial("/", undefined, { intentional: true });
    throw new Error("User not found");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  const data = await response.json();
  return data.user;
};
export const useUserProfileData = () => {
  const {
    data: userProfile,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfile, Error>({
    queryKey: ["user-profile-data"],
    queryFn: fetchUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
  });

  return {
    userProfile,
    isLoading,
    error,
    refreshUserProfile: refetch,
  };
};

// Subscription status lives in @/hooks/useSubscriptionData (shared with navbar dot + subscription page).

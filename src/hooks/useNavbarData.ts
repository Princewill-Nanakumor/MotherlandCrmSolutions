// src/hooks/useNavbarData.ts
import { useQuery } from "@tanstack/react-query";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";

interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  balance: number;
  status: string;
}

interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  balance: number;
  subscriptionEndDate?: string | null;
  subscriptionStartDate?: string | null;
}

// src/hooks/useNavbarData.ts
const fetchUserProfile = async (): Promise<UserProfile> => {
  const response = await fetch("/api/user/profile");

  if (response.status === 404) {
    console.log("User not found, signing out...");
    await signOutWithoutInterstitial("/");
    throw new Error("User not found");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  const data = await response.json();
  return data.user;
};
const fetchSubscriptionData = async (): Promise<SubscriptionData> => {
  const response = await fetch("/api/subscription/status");

  if (response.status === 404) {
    // // User not found - likely deleted from database
    // console.log("User not found in database, signing out...");
    // await signOut({ callbackUrl: "/" });
    throw new Error("User not found");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch subscription data");
  }

  return response.json();
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

export const useSubscriptionData = () => {
  const {
    data: subscriptionData,
    isLoading,
    error,
    refetch,
  } = useQuery<SubscriptionData, Error>({
    queryKey: ["subscription-data"],
    queryFn: fetchSubscriptionData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: true,
  });

  return {
    subscriptionData,
    isLoading,
    error,
    refreshSubscriptionData: refetch,
  };
};

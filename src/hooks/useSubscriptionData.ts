// src/hooks/useSubscriptionData.ts
import { useQuery } from "@tanstack/react-query";

interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  subscriptionEndDate: string | null;
  balance: number;
}

// Fetch function outside the hook to prevent recreation
const fetchSubscriptionData = async (): Promise<SubscriptionData> => {
  const response = await fetch("/api/subscription/status", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch subscription data");
  }

  return response.json();
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

  // Calculate if user has active subscription
  const hasActiveSubscription = subscriptionData
    ? (() => {
        const now = new Date();
        const trialEndDate = subscriptionData.trialEndsAt
          ? new Date(subscriptionData.trialEndsAt)
          : null;
        const subscriptionEndDate = subscriptionData.subscriptionEndDate
          ? new Date(subscriptionData.subscriptionEndDate)
          : null;

        const isTrialExpired = trialEndDate && now > trialEndDate;
        const isSubscriptionExpired =
          subscriptionEndDate && now > subscriptionEndDate;

        // User has active subscription if:
        // 1. They have a paid subscription (active) and it's not expired
        // 2. They're in trial period and trial hasn't expired
        return (
          (subscriptionData.subscriptionStatus === "active" &&
            !isSubscriptionExpired) ||
          (subscriptionData.subscriptionStatus === "trial" && !isTrialExpired)
        );
      })()
    : false;

  return {
    subscriptionData,
    hasActiveSubscription,
    isLoading,
    error,
    refreshSubscriptionData: refetch,
  };
};

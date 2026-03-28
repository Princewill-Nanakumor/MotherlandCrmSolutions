// src/hooks/useSubscriptionData.ts
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

interface SubscriptionData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: "active" | "inactive" | "trial" | "expired";
  subscriptionEndDate: string | null;
  balance: number;
}

const SUBSCRIPTION_FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw e;
  }
}

const fetchSubscriptionData = async (
  role?: string
): Promise<SubscriptionData> => {
  const endpoint =
    role === "AGENT"
      ? "/api/subscription/agent-status"
      : "/api/subscription/status";
  const response = await fetchWithTimeout(
    endpoint,
    SUBSCRIPTION_FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error("Failed to fetch subscription data");
  }

  return response.json();
};

export const useSubscriptionData = () => {
  const { status, data: session } = useSession();
  const role = session?.user?.role;

  const {
    data: subscriptionData,
    isLoading,
    error,
    refetch,
  } = useQuery<SubscriptionData, Error>({
    queryKey: ["subscription-data", role],
    queryFn: () => fetchSubscriptionData(role),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: hasAuthorizedSession(status, session),
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

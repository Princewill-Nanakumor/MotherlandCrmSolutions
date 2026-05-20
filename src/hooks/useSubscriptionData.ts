// src/hooks/useSubscriptionData.ts
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import {
  resolveSubscriptionIndicator,
  type SubscriptionIndicatorState,
  type SubscriptionStatusData,
} from "@/lib/subscriptionIndicator";
import {
  fetchSubscriptionStatus,
  subscriptionStatusQueryKey,
} from "@/lib/subscriptionQueries";

export type { SubscriptionStatusData, SubscriptionIndicatorState };

export const useSubscriptionData = () => {
  const { status, data: session } = useSession();
  const role = session?.user?.role;

  const {
    data: subscriptionData,
    isLoading,
    error,
    refetch,
  } = useQuery<SubscriptionStatusData, Error>({
    queryKey: subscriptionStatusQueryKey(role),
    queryFn: () => fetchSubscriptionStatus(role),
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: hasAuthorizedSession(status, session),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 120_000;
      const indicator = resolveSubscriptionIndicator(data);
      if (indicator === "expired") return false;
      if (indicator === "warning") return 60_000;
      if (indicator === "active" && data.subscriptionEndDate) return 120_000;
      return 180_000;
    },
  });

  const indicator = resolveSubscriptionIndicator(subscriptionData);

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
    indicator,
    isLoading,
    error,
    refreshSubscriptionData: refetch,
  };
};

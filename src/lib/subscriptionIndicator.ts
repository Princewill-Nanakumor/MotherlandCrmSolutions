export type SubscriptionStatusValue =
  | "active"
  | "inactive"
  | "trial"
  | "expired";

export interface SubscriptionStatusData {
  isOnTrial: boolean;
  trialEndsAt: string | null;
  currentPlan: string | null;
  subscriptionStatus: SubscriptionStatusValue;
  balance: number;
  subscriptionEndDate?: string | null;
  subscriptionStartDate?: string | null;
}

/** Traffic-light state for the navbar presence dot (Slack/Teams-style). */
export type SubscriptionIndicatorState =
  | "active"
  | "warning"
  | "expired"
  | "unknown";

const EXPIRING_SOON_DAYS = 7;

export function resolveSubscriptionIndicator(
  data: SubscriptionStatusData | null | undefined,
): SubscriptionIndicatorState {
  if (!data) return "unknown";

  const now = new Date();
  const trialEnd = data.trialEndsAt ? new Date(data.trialEndsAt) : null;
  const subEnd = data.subscriptionEndDate
    ? new Date(data.subscriptionEndDate)
    : null;

  const trialExpired = Boolean(trialEnd && now >= trialEnd);
  const subExpired = Boolean(subEnd && now >= subEnd);

  if (data.subscriptionStatus === "expired" || data.subscriptionStatus === "inactive") {
    return "expired";
  }

  if (data.subscriptionStatus === "active") {
    if (subExpired) return "expired";
    if (subEnd) {
      const daysLeft = Math.ceil(
        (subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft <= EXPIRING_SOON_DAYS) return "warning";
    }
    return "active";
  }

  if (data.subscriptionStatus === "trial" || data.isOnTrial) {
    if (trialExpired) return "expired";
    if (trialEnd) {
      const daysLeft = Math.ceil(
        (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysLeft <= EXPIRING_SOON_DAYS) return "warning";
    }
    return "warning";
  }

  return "unknown";
}

export const SUBSCRIPTION_INDICATOR_DOT_CLASS: Record<
  SubscriptionIndicatorState,
  string
> = {
  active: "bg-green-500 ring-white dark:ring-gray-900",
  warning: "bg-yellow-400 ring-white dark:ring-gray-900",
  expired: "bg-red-500 ring-white dark:ring-gray-900",
  unknown: "bg-gray-400 ring-white dark:ring-gray-900",
};

export const SUBSCRIPTION_INDICATOR_LABEL: Record<
  SubscriptionIndicatorState,
  string
> = {
  active: "Subscription active",
  warning: "Trial active or subscription ending soon",
  expired: "Subscription expired or inactive",
  unknown: "Checking subscription status",
};

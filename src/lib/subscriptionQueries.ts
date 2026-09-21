import type { QueryClient } from "@tanstack/react-query";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import type { SubscriptionStatusData } from "@/lib/subscriptionIndicator";
import { isTenantStaff } from "@/lib/roles";

export function subscriptionStatusQueryKey(role?: string) {
  return ["subscription-status", role ?? "unknown"] as const;
}

export const SUBSCRIPTION_SESSION_ERROR = "SUBSCRIPTION_SESSION";
export const SUBSCRIPTION_NETWORK_ERROR = "SUBSCRIPTION_NETWORK";

export function isSubscriptionStatusQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return (
    root === "subscription-status" ||
    root === "subscription-data" ||
    (root === "subscription" && queryKey[1] === "status")
  );
}

export async function fetchSubscriptionStatus(
  role?: string,
): Promise<SubscriptionStatusData> {
  // Agents and sub-admins inherit the tenant owner's subscription — not their
  // own user document (which has no plan fields).
  const endpoint = isTenantStaff(role)
    ? "/api/subscription/agent-status"
    : "/api/subscription/status";

  try {
    const response = await apiCallWithSessionRefresh(endpoint, {
      cache: "no-store",
    });

    if (response.status === 401) {
      throw new Error(SUBSCRIPTION_SESSION_ERROR);
    }
    if (!response.ok) {
      throw new Error(SUBSCRIPTION_NETWORK_ERROR);
    }

    return response.json();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === SUBSCRIPTION_SESSION_ERROR ||
        error.message.toLowerCase().includes("session expired"))
    ) {
      throw new Error(SUBSCRIPTION_SESSION_ERROR);
    }
    throw new Error(SUBSCRIPTION_NETWORK_ERROR);
  }
}

/** Keep navbar dot, plan badge, and subscription page in sync after subscribe/pay. */
export async function syncSubscriptionQueries(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({
    predicate: (query) => isSubscriptionStatusQuery(query.queryKey),
  });
  await queryClient.refetchQueries({
    predicate: (query) => isSubscriptionStatusQuery(query.queryKey),
    type: "all",
  });
  await queryClient.invalidateQueries({ queryKey: ["user-profile-data"] });
  await queryClient.refetchQueries({
    queryKey: ["user-profile-data"],
    type: "all",
  });
}

import type { QueryClient } from "@tanstack/react-query";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import type { SubscriptionStatusData } from "@/lib/subscriptionIndicator";
import { isTenantStaff } from "@/lib/roles";

export function subscriptionStatusQueryKey(role?: string) {
  return ["subscription-status", role ?? "unknown"] as const;
}

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
  const response = await apiCallWithSessionRefresh(endpoint, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch subscription status");
  }

  return response.json();
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

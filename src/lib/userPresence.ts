import type { SubscriptionIndicatorState } from "@/lib/subscriptionIndicator";

/** Slack-style idle threshold (no input while tab is visible). */
export const USER_PRESENCE_IDLE_MS = 10 * 60 * 1000;

export type UserPresenceState = "active" | "idle" | "away";

export function resolveUserPresence(
  lastActivityAt: number,
  isDocumentVisible: boolean,
  now = Date.now(),
): UserPresenceState {
  if (!isDocumentVisible) return "away";
  if (now - lastActivityAt >= USER_PRESENCE_IDLE_MS) return "idle";
  return "active";
}

export type NavbarPresenceDot = "active" | "idle" | "expired" | "unknown";

export function resolveNavbarPresenceDot(
  subscription: SubscriptionIndicatorState,
  presence: UserPresenceState,
): NavbarPresenceDot {
  if (subscription === "expired") return "expired";
  if (subscription === "unknown") return "unknown";
  if (presence === "idle" || presence === "away") return "idle";
  return "active";
}

export const NAVBAR_PRESENCE_DOT_BG: Record<NavbarPresenceDot, string> = {
  active: "bg-green-500",
  idle: "bg-yellow-400",
  expired: "bg-red-500",
  unknown: "bg-gray-400",
};

/** @deprecated Use NAVBAR_PRESENCE_DOT_BG + ring utilities on the element */
export const NAVBAR_PRESENCE_DOT_CLASS: Record<NavbarPresenceDot, string> = {
  active: `${NAVBAR_PRESENCE_DOT_BG.active} ring-white dark:ring-gray-900`,
  idle: `${NAVBAR_PRESENCE_DOT_BG.idle} ring-white dark:ring-gray-900`,
  expired: `${NAVBAR_PRESENCE_DOT_BG.expired} ring-white dark:ring-gray-900`,
  unknown: `${NAVBAR_PRESENCE_DOT_BG.unknown} ring-white dark:ring-gray-900`,
};

export function getNavbarPresenceLabel(
  dot: NavbarPresenceDot,
  presence: UserPresenceState,
  subscriptionBlocked: boolean,
): string {
  if (subscriptionBlocked) {
    return "Subscription expired or inactive — open subscription";
  }
  switch (dot) {
    case "active":
      return "Active";
    case "idle":
      return presence === "away"
        ? "Away — tab in background"
        : "Away — no recent activity";
    case "expired":
      return "Subscription expired or inactive";
    default:
      return "Checking status";
  }
}

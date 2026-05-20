import { useMemo } from "react";
import { useUserPresence } from "@/context/UserPresenceContext";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import {
  getNavbarPresenceLabel,
  NAVBAR_PRESENCE_DOT_BG,
  resolveNavbarPresenceDot,
  type NavbarPresenceDot,
} from "@/lib/userPresence";
import { resolveSubscriptionIndicator } from "@/lib/subscriptionIndicator";

export function useNavbarPresenceIndicator() {
  const { presence } = useUserPresence();
  const { subscriptionData, isLoading: subscriptionLoading } =
    useSubscriptionData();

  const subscriptionIndicator = resolveSubscriptionIndicator(subscriptionData);
  const subscriptionBlocked = subscriptionIndicator === "expired";

  const dot: NavbarPresenceDot = useMemo(
    () =>
      subscriptionLoading
        ? "unknown"
        : resolveNavbarPresenceDot(subscriptionIndicator, presence),
    [subscriptionLoading, subscriptionIndicator, presence],
  );

  const label = useMemo(
    () => getNavbarPresenceLabel(dot, presence, subscriptionBlocked),
    [dot, presence, subscriptionBlocked],
  );

  return {
    dot,
    dotBgClassName: NAVBAR_PRESENCE_DOT_BG[dot],
    label,
    presence,
    subscriptionIndicator,
    isLoading: subscriptionLoading,
  };
}

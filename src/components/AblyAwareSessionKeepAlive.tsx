"use client";

import { useEffect } from "react";
import { getSession } from "next-auth/react";
import {
  ABLY_HEALTHY_POLL_MS,
  useAblyAwareRefetchInterval,
} from "@/hooks/useAblyAwareRefetchInterval";

const SESSION_NORMAL_MS = 5 * 60 * 1000;

/**
 * Drives session refresh on an Ably-aware interval. Use with
 * SessionProvider refetchInterval={0} so NextAuth does not also poll.
 */
export function AblyAwareSessionKeepAlive() {
  const intervalMs = useAblyAwareRefetchInterval(SESSION_NORMAL_MS, {
    healthyMs: ABLY_HEALTHY_POLL_MS,
  });

  useEffect(() => {
    const refreshSession = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      void getSession();
    };

    const id = window.setInterval(refreshSession, intervalMs);
    window.addEventListener("online", refreshSession);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", refreshSession);
    };
  }, [intervalMs]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getAblyRealtimeClient,
  isAblyRealtimeConnected,
} from "@/libs/ablyClient";

/** Fallback poll when Ably is healthy (connected). */
export const ABLY_HEALTHY_POLL_MS = 12 * 60 * 1000; // 12 minutes

/**
 * Tracks whether the shared Ably realtime client is in a connected state.
 * Used to slow or pause HTTP fallback polls when realtime delivery is healthy.
 */
export function useAblyConnectionHealthy(): boolean {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [healthy, setHealthy] = useState(false);

  useEffect(() => {
    if (!userId) {
      setHealthy(false);
      return;
    }

    const client = getAblyRealtimeClient(userId);
    const sync = () => {
      setHealthy(isAblyRealtimeConnected());
    };

    sync();
    client.connection.on("connected", sync);
    client.connection.on("disconnected", sync);
    client.connection.on("suspended", sync);
    client.connection.on("failed", sync);
    client.connection.on("closed", sync);
    client.connection.on("connecting", sync);

    return () => {
      client.connection.off("connected", sync);
      client.connection.off("disconnected", sync);
      client.connection.off("suspended", sync);
      client.connection.off("failed", sync);
      client.connection.off("closed", sync);
      client.connection.off("connecting", sync);
    };
  }, [userId]);

  return healthy;
}

/**
 * React Query refetchInterval that slows down while Ably is connected.
 * Pass `channelReady` when a specific channel must also be subscribed.
 */
export function useAblyAwareRefetchInterval(
  normalMs: number,
  options?: {
    /** When false, always use the normal (fast) interval. Default true. */
    channelReady?: boolean;
    healthyMs?: number;
  },
): number {
  const ablyHealthy = useAblyConnectionHealthy();
  const channelReady = options?.channelReady ?? true;
  const healthyMs = options?.healthyMs ?? ABLY_HEALTHY_POLL_MS;

  if (ablyHealthy && channelReady) {
    return healthyMs;
  }
  return normalMs;
}

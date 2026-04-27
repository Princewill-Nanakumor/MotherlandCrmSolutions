"use client";

import Ably from "ably";

let leadRealtime: Ably.Realtime | null = null;
let leadRealtimeCacheKey: string | null = null;

/**
 * Dedicated Realtime connection for a single lead channel, authorized via
 * `/api/ably/token/lead` (assignment-checked). Keeps the main `/api/ably/token`
 * connection free of tenant-wide `lead:*` capability for agents.
 */
export function getAblyLeadRealtimeClient(
  userId: string,
  leadId: string,
): Ably.Realtime {
  const cacheKey = `${userId}::${leadId}`;
  if (leadRealtime && leadRealtimeCacheKey === cacheKey) {
    return leadRealtime;
  }
  if (leadRealtime) {
    try {
      leadRealtime.close();
    } catch {
      // ignore
    }
    leadRealtime = null;
    leadRealtimeCacheKey = null;
  }

  leadRealtime = new Ably.Realtime({
    authUrl: `/api/ably/token/lead?leadId=${encodeURIComponent(leadId)}`,
    authMethod: "GET",
    clientId: userId,
    autoConnect: true,
  });
  leadRealtimeCacheKey = cacheKey;
  return leadRealtime;
}

export function releaseAblyLeadRealtimeClient(leadId: string): void {
  if (!leadRealtime || !leadRealtimeCacheKey?.endsWith(`::${leadId}`)) {
    return;
  }
  try {
    leadRealtime.close();
  } catch {
    // ignore
  }
  leadRealtime = null;
  leadRealtimeCacheKey = null;
}

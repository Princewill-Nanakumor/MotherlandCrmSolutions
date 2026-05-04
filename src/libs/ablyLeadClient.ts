"use client";

import Ably from "ably";
import type { TokenDetails } from "ably";

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

  const tokenUrl = `/api/ably/token/lead?leadId=${encodeURIComponent(leadId)}`;

  const fresh = new Ably.Realtime({
    authCallback(_tokenParams, callback) {
      void (async () => {
        try {
          const res = await fetch(tokenUrl, {
            method: "GET",
            credentials: "include",
          });
          if (!res.ok) {
            if (res.status === 401) {
              const self = this as Ably.Realtime;
              try {
                self.close();
              } catch {
                // ignore
              }
              if (leadRealtime === self) {
                leadRealtime = null;
                leadRealtimeCacheKey = null;
              }
              callback("Unauthorized", null);
              return;
            }
            callback(`Token request failed (${res.status})`, null);
            return;
          }
          const tokenDetails = (await res.json()) as TokenDetails;
          callback(null, tokenDetails);
        } catch (e) {
          callback(
            e instanceof Error ? e.message : "Token request failed",
            null,
          );
        }
      })();
    },
    clientId: userId,
    autoConnect: true,
  });
  leadRealtime = fresh;
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

/** Close the lead-scoped Realtime client (call on sign-out with main client). */
export function disconnectAblyLeadRealtimeClient(): void {
  if (leadRealtime) {
    try {
      leadRealtime.close();
    } catch {
      // ignore
    }
    leadRealtime = null;
    leadRealtimeCacheKey = null;
  }
}

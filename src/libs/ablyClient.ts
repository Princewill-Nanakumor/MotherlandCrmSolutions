"use client";

import Ably from "ably";
import type { TokenDetails } from "ably";

let realtimeClient: Ably.Realtime | null = null;
let realtimeClientUserId: string | null = null;

export function getAblyRealtimeClient(userId: string): Ably.Realtime {
  if (!realtimeClient || realtimeClientUserId !== userId) {
    if (realtimeClient) {
      try {
        realtimeClient.close();
      } catch {
        /* ignore */
      }
    }

    const fresh = new Ably.Realtime({
      // authUrl alone keeps retrying token fetches after sign-out → noisy 401s.
      authCallback(_tokenParams, callback) {
        void (async () => {
          try {
            const res = await fetch("/api/ably/token", {
              method: "GET",
              credentials: "include",
            });
            if (!res.ok) {
              if (res.status === 401) {
                const self = this as Ably.Realtime;
                try {
                  self.close();
                } catch {
                  /* ignore */
                }
                if (realtimeClient === self) {
                  realtimeClient = null;
                  realtimeClientUserId = null;
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
    realtimeClient = fresh;
    realtimeClientUserId = userId;
  }

  return realtimeClient;
}

/** Close the shared dashboard connection (e.g. after sign-out) so token refresh stops. */
export function disconnectAblyRealtimeClient(): void {
  if (realtimeClient) {
    try {
      realtimeClient.close();
    } catch {
      /* ignore */
    }
    realtimeClient = null;
    realtimeClientUserId = null;
  }
}

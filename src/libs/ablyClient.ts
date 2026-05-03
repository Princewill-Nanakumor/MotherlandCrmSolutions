"use client";

import Ably from "ably";

let realtimeClient: Ably.Realtime | null = null;
let realtimeClientUserId: string | null = null;

export function getAblyRealtimeClient(userId: string): Ably.Realtime {
  if (!realtimeClient || realtimeClientUserId !== userId) {
    // If session user changes, close previous client and create a fresh scoped client.
    if (realtimeClient) {
      try {
        realtimeClient.close();
      } catch {}
    }

    realtimeClient = new Ably.Realtime({
      authUrl: "/api/ably/token",
      authMethod: "GET",
      clientId: userId,
      autoConnect: true,
    });
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

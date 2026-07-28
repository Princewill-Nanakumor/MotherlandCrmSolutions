"use client";

import { useEffect, useState } from "react";
import type { Connection, RealtimeChannel } from "ably";

/**
 * True only while the channel is attached. Clears on detach/fail/suspend and
 * after reconnect until the channel has reattached.
 */
export function useAblyChannelAttached(
  channel: RealtimeChannel | null,
  connection: Connection | null,
): boolean {
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    if (!channel || !connection) {
      setAttached(false);
      return;
    }

    const sync = () => {
      setAttached(channel.state === "attached");
    };

    sync();
    channel.on("attached", sync);
    channel.on("detached", sync);
    channel.on("failed", sync);
    channel.on("suspended", sync);

    const onConnected = () => {
      if (channel.state === "attached") {
        sync();
        return;
      }
      setAttached(false);
      void channel
        .attach()
        .then(sync)
        .catch(() => setAttached(false));
    };

    const onConnectionLost = () => setAttached(false);

    connection.on("connected", onConnected);
    connection.on("disconnected", onConnectionLost);
    connection.on("suspended", onConnectionLost);
    connection.on("failed", onConnectionLost);

    return () => {
      channel.off("attached", sync);
      channel.off("detached", sync);
      channel.off("failed", sync);
      channel.off("suspended", sync);
      connection.off("connected", onConnected);
      connection.off("disconnected", onConnectionLost);
      connection.off("suspended", onConnectionLost);
      connection.off("failed", onConnectionLost);
      setAttached(false);
    };
  }, [channel, connection]);

  return attached;
}

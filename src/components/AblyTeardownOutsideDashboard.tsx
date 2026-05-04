"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { disconnectAblyRealtimeClient } from "@/libs/ablyClient";
import { disconnectAblyLeadRealtimeClient } from "@/libs/ablyLeadClient";

/**
 * The dashboard keeps a module-scoped Ably Realtime client. If you leave
 * `/dashboard` without a full reload (or dev HMR keeps an old connection),
 * the SDK can still request `/api/ably/token` → 401 while you are on `/`,
 * `/login`, etc. Tear down whenever this tab is not under `/dashboard`.
 */
export function AblyTeardownOutsideDashboard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const onDashboard = pathname?.startsWith("/dashboard") ?? false;
    if (!onDashboard) {
      disconnectAblyRealtimeClient();
      disconnectAblyLeadRealtimeClient();
    }
  }, [pathname]);

  return null;
}

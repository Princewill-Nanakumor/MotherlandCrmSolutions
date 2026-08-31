"use client";

import { useEffect, useRef } from "react";
import { useSession, getSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { getAblyRealtimeClient } from "@/libs/ablyClient";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  getAdminLeadsChannelName,
} from "@/libs/realtime";
import { refetchLeadFilterOptions } from "@/lib/leadFilterQueries";
import { applyRemoteLeadStatusToListCaches } from "@/lib/leadsListCache";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

/**
 * Subscribes to tenant lead events after first paint so Ably scope/token
 * work does not compete with the initial leads request.
 */
export function TenantLeadsRealtimeSync() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const currentUserIdRef = useRef<string | undefined>(undefined);
  currentUserIdRef.current = session?.user?.id;

  useEffect(() => {
    if (!session?.user?.id) return;

    let cancelled = false;
    let realtimeClient: ReturnType<typeof getAblyRealtimeClient> | null = null;
    let channelName: string | null = null;
    let channel: {
      subscribe: (
        eventName: string,
        listener: (message: { data?: unknown }) => void,
      ) => void;
      unsubscribe: (
        eventName: string,
        listener: (message: { data?: unknown }) => void,
      ) => void;
      attach: () => Promise<unknown>;
      detach: () => Promise<unknown>;
    } | null = null;
    let subscribed = false;

    const onAdminLeadsUpdated = (message: { data?: unknown }) => {
      const eventData = (message.data ?? {}) as {
        type?: string;
        leadId?: string;
        leadIds?: string[];
        status?: string;
        deletedLeads?: number;
        importId?: string;
        percent?: number;
        userId?: string;
      };
      const eventType = eventData.type ?? "";
      const isUserEvent = eventType.startsWith("user_");
      const isImportEvent =
        eventType === "import_deleted" ||
        eventType === "imports_cleared" ||
        eventType === "import_progress";
      const importTouchedLeads = (eventData.deletedLeads ?? 0) > 0;

      if (eventType === "import_progress") {
        void queryClient.invalidateQueries({ queryKey: ["import-history"] });
        return;
      }

      if (isUserEvent) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const root = Array.isArray(query.queryKey)
              ? query.queryKey[0]
              : null;
            return (
              root === "users" ||
              root === "user-usage-data" ||
              root === "admin-overview"
            );
          },
        });
        if (
          eventData.userId &&
          eventData.userId === currentUserIdRef.current
        ) {
          void getSession();
        }
        return;
      }

      if (isImportEvent && !importTouchedLeads) {
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const root = Array.isArray(query.queryKey)
              ? query.queryKey[0]
              : null;
            return (
              root === "import-history" ||
              root === "import-usage-data" ||
              root === "admin-overview"
            );
          },
        });
        return;
      }

      if (eventType === "status_changed" && eventData.status) {
        const statusLeadIds = [
          ...(eventData.leadId ? [eventData.leadId] : []),
          ...(Array.isArray(eventData.leadIds) ? eventData.leadIds : []),
        ].filter((id, index, arr) => id && arr.indexOf(id) === index);

        for (const leadId of statusLeadIds) {
          applyRemoteLeadStatusToListCaches(
            queryClient,
            leadId,
            eventData.status,
            { touchActivity: true },
          );
        }
      }

      void queryClient.invalidateQueries({
        predicate: (query) => {
          const root = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
          return (
            root === "leads" ||
            root === "assignedLeads" ||
            root === "admin-overview" ||
            root === "leads-stats" ||
            root === "users" ||
            root === "import-history" ||
            root === "import-usage-data"
          );
        },
      });

      void refetchLeadFilterOptions(queryClient);

      if (eventData.leadId) {
        void queryClient.invalidateQueries({
          queryKey: ["activities", eventData.leadId],
          exact: false,
        });
      }
      if (Array.isArray(eventData.leadIds)) {
        for (const leadId of eventData.leadIds) {
          if (typeof leadId !== "string" || !leadId) continue;
          void queryClient.invalidateQueries({
            queryKey: ["activities", leadId],
            exact: false,
          });
        }
      }
    };

    void (async () => {
      try {
        const scopeResponse = await apiCallWithSessionRefresh(
          "/api/ably/scope",
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (!scopeResponse.ok || cancelled) return;

        const scopeData = (await scopeResponse.json()) as {
          adminScope?: string;
        };
        if (!scopeData.adminScope || cancelled) return;

        realtimeClient = getAblyRealtimeClient(session.user.id);
        channelName = getAdminLeadsChannelName(scopeData.adminScope);
        const activeChannel = realtimeClient.channels.get(channelName);
        channel = activeChannel;
        await activeChannel.attach();
        if (cancelled) return;
        activeChannel.subscribe(ADMIN_LEADS_UPDATED_EVENT, onAdminLeadsUpdated);
        subscribed = true;
      } catch {
        // Leads pages remain functional with normal query invalidation.
      }
    })();

    return () => {
      cancelled = true;
      if (channel && subscribed) {
        channel.unsubscribe(ADMIN_LEADS_UPDATED_EVENT, onAdminLeadsUpdated);
      }
      if (channel) {
        void channel.detach().catch(() => undefined);
      }
      if (realtimeClient && channelName) {
        try {
          realtimeClient.channels.release(channelName);
        } catch {
          // ignore
        }
      }
    };
  }, [queryClient, session?.user?.id, session?.user?.role]);

  return null;
}

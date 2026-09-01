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
import { removeLeadsFromAssignedLeadsCaches } from "@/lib/leadsListCache";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import {
  invalidateLeadDetailCache,
  isActivityTimelineAdminEvent,
  isTimelineChurnAdminEvent,
  syncActivityTimelineFromAdminEvent,
} from "@/lib/leadPanelRealtimeSync";

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
    const userId = session?.user?.id;
    if (!userId) return;

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
        activityId?: string;
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

      // Comment/reminder CRUD already patches detail caches in the panel mutation.
      // Do not invalidate ["leads"] + refetch activities here — that refetches
      // /api/leads/all and the full timeline (~5s) on every delete.
      if (isTimelineChurnAdminEvent(eventType)) {
        const leadId = eventData.leadId;
        if (leadId) {
          if (eventType.startsWith("comment_")) {
            void queryClient.invalidateQueries({
              queryKey: ["comments", leadId],
              exact: true,
            });
            if (eventType === "comment_created" || eventType === "comment_updated") {
              void invalidateLeadDetailCache(queryClient, leadId);
            }
          }
          if (eventType.startsWith("reminder_")) {
            void queryClient.invalidateQueries({
              queryKey: ["reminders", leadId],
              exact: true,
              refetchType: "inactive",
            });
            void queryClient.invalidateQueries({
              queryKey: ["activities", leadId],
              refetchType: "none",
            });
          }
        }
        return;
      }

      if (isActivityTimelineAdminEvent(eventType)) {
        void syncActivityTimelineFromAdminEvent(queryClient, eventData);
        if (
          eventType === "lead_assigned" ||
          eventType === "lead_assigned_bulk" ||
          eventType === "lead_unassigned" ||
          eventType === "lead_unassigned_bulk"
        ) {
          const assignmentLeadIds = [
            ...(eventData.leadId ? [eventData.leadId] : []),
            ...(Array.isArray(eventData.leadIds) ? eventData.leadIds : []),
          ].filter((id, index, arr) => id && arr.indexOf(id) === index);

          if (assignmentLeadIds.length > 0) {
            removeLeadsFromAssignedLeadsCaches(queryClient, assignmentLeadIds);
            void queryClient.refetchQueries({
              predicate: (query) => {
                const root = Array.isArray(query.queryKey)
                  ? query.queryKey[0]
                  : null;
                return root === "assignedLeads";
              },
            });
          }
        }

        void queryClient.invalidateQueries({
          predicate: (query) => {
            const root = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
            return (
              root === "leads" ||
              root === "assignedLeads" ||
              root === "leads-stats"
            );
          },
        });
        void refetchLeadFilterOptions(queryClient);
        return;
      }

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
          exact: true,
        });
      }
      if (Array.isArray(eventData.leadIds)) {
        for (const leadId of eventData.leadIds) {
          if (typeof leadId !== "string" || !leadId) continue;
          void queryClient.invalidateQueries({
            queryKey: ["activities", leadId],
            exact: true,
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

        realtimeClient = getAblyRealtimeClient(userId);
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

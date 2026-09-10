import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateLeadCommentsTimeline,
  patchCommentDeletedInCache,
} from "@/lib/commentCacheSync";
import {
  patchActivityDeletedInCache,
  refreshActivitiesCacheForLead,
} from "@/lib/leadActivitiesQuery";
import { normalizeLeadStatusId } from "@/lib/leadClientUpdate";
import { applyRemoteLeadStatusToListCaches } from "@/lib/leadsListCache";
import type { Lead } from "@/types/leads";
import {
  patchReminderDeletedInCache,
  refreshRemindersCacheForLead,
} from "@/lib/reminderCache";

export type AdminLeadPanelEvent = {
  type?: string;
  leadId?: string;
  leadIds?: string[];
  commentId?: string;
  reminderId?: string;
  activityId?: string;
  status?: string;
};

const COMMENT_TIMELINE_EVENTS = new Set([
  "comment_created",
  "comment_updated",
  "comment_deleted",
]);

const REMINDER_TIMELINE_EVENTS = new Set([
  "reminder_created",
  "reminder_updated",
  "reminder_deleted",
]);

const CALL_TIMELINE_EVENTS = new Set(["call_initiated"]);

const ACTIVITY_TIMELINE_EVENTS = new Set([
  "status_changed",
  "bulk_status_changed",
  "lead_assigned",
  "lead_unassigned",
  "lead_assigned_bulk",
  "lead_unassigned_bulk",
  "activity_deleted",
]);

const ASSIGNMENT_DETAIL_EVENTS = new Set([
  "lead_assigned",
  "lead_unassigned",
  "lead_assigned_bulk",
  "lead_unassigned_bulk",
]);

/** Admin Ably events that only touch comment/reminder/call detail caches — not the full leads list. */
export function isTimelineChurnAdminEvent(type: string): boolean {
  return (
    COMMENT_TIMELINE_EVENTS.has(type) ||
    REMINDER_TIMELINE_EVENTS.has(type) ||
    CALL_TIMELINE_EVENTS.has(type)
  );
}

export function isActivityTimelineAdminEvent(type: string): boolean {
  return ACTIVITY_TIMELINE_EVENTS.has(type);
}

export function collectEventLeadIds(event: AdminLeadPanelEvent): string[] {
  return [
    ...(event.leadId ? [event.leadId] : []),
    ...(Array.isArray(event.leadIds) ? event.leadIds : []),
  ].filter((id, index, arr) => Boolean(id) && arr.indexOf(id) === index);
}

export function adminEventTouchesLead(
  event: AdminLeadPanelEvent,
  openLeadId: string,
): boolean {
  if (event.leadId === openLeadId) return true;
  return (
    Array.isArray(event.leadIds) &&
    event.leadIds.some((id) => id === openLeadId)
  );
}

/** Refresh the activity timeline for one lead (open panel, closed cache, or reopen). */
export async function invalidateLeadActivitiesTimeline(
  queryClient: QueryClient,
  leadId: string,
): Promise<void> {
  if (!leadId) return;

  const activities = await refreshActivitiesCacheForLead(queryClient, leadId);
  if (activities) return;

  await queryClient.refetchQueries({
    queryKey: ["activities", leadId],
    exact: true,
    type: "all",
  });
}

/** Refresh reminders for one lead whether the panel is open or closed. */
export async function invalidateLeadRemindersTimeline(
  queryClient: QueryClient,
  leadId: string,
): Promise<void> {
  if (!leadId) return;

  const reminders = await refreshRemindersCacheForLead(queryClient, leadId);
  if (reminders) return;

  await queryClient.refetchQueries({
    queryKey: ["reminders", leadId],
    exact: true,
    type: "all",
  });
}

/** Keep /dashboard/leads/[id] and /dashboard/all-leads/[id] in sync across tabs. */
export function patchLeadDetailStatusInCache(
  queryClient: QueryClient,
  leadId: string,
  status: string,
): void {
  if (!leadId) return;
  const statusId = normalizeLeadStatusId(status);
  const now = new Date().toISOString();
  queryClient.setQueryData(["lead", leadId], (old: Lead | undefined) => {
    if (!old) return old;
    return {
      ...old,
      status: statusId,
      statusChangedAt: now,
      lastActivityAt: now,
      updatedAt: now,
    };
  });
}

export async function invalidateLeadDetailCache(
  queryClient: QueryClient,
  leadId: string,
): Promise<void> {
  if (!leadId) return;
  await queryClient.invalidateQueries({
    queryKey: ["lead", leadId],
    exact: true,
    refetchType: "all",
  });
}

export async function syncLeadDetailFromAdminEvent(
  queryClient: QueryClient,
  event: AdminLeadPanelEvent,
): Promise<void> {
  const type = event.type ?? "";
  const leadIds = collectEventLeadIds(event);
  if (leadIds.length === 0) return;

  if (
    (type === "status_changed" || type === "bulk_status_changed") &&
    event.status
  ) {
    for (const leadId of leadIds) {
      patchLeadDetailStatusInCache(queryClient, leadId, event.status);
    }
    return;
  }

  if (ASSIGNMENT_DETAIL_EVENTS.has(type)) {
    await Promise.all(
      leadIds.map((leadId) => invalidateLeadDetailCache(queryClient, leadId)),
    );
  }
}

/**
 * Pull comment rows from the API and upsert into list/detail caches.
 * Create/update refetch; delete only patches so a GET cannot restore the row.
 */
export async function syncCommentsFromAdminEvent(
  queryClient: QueryClient,
  event: AdminLeadPanelEvent,
): Promise<void> {
  const type = event.type ?? "";
  const leadId = event.leadId;
  if (!leadId || !COMMENT_TIMELINE_EVENTS.has(type)) return;

  if (type === "comment_deleted" && event.commentId) {
    await queryClient.cancelQueries({
      queryKey: ["comments", leadId],
      exact: true,
    });
    patchCommentDeletedInCache(queryClient, leadId, event.commentId);
    return;
  }

  await invalidateLeadCommentsTimeline(queryClient, leadId);

  if (type === "comment_created" || type === "comment_updated") {
    void invalidateLeadDetailCache(queryClient, leadId);
  }
}

export async function syncActivityTimelineFromAdminEvent(
  queryClient: QueryClient,
  event: AdminLeadPanelEvent,
): Promise<void> {
  const type = event.type ?? "";
  if (!isActivityTimelineAdminEvent(type)) return;

  const leadIds = collectEventLeadIds(event);
  if (leadIds.length === 0) return;

  if (type === "activity_deleted" && event.activityId) {
    for (const leadId of leadIds) {
      void queryClient.cancelQueries({
        queryKey: ["activities", leadId],
        exact: true,
      });
      patchActivityDeletedInCache(queryClient, leadId, event.activityId);
    }
    return;
  }

  if (
    (type === "status_changed" || type === "bulk_status_changed") &&
    event.status
  ) {
    for (const leadId of leadIds) {
      applyRemoteLeadStatusToListCaches(queryClient, leadId, event.status, {
        touchActivity: true,
      });
      patchLeadDetailStatusInCache(queryClient, leadId, event.status);
    }
  }

  if (ASSIGNMENT_DETAIL_EVENTS.has(type)) {
    await Promise.all(
      leadIds.map((leadId) => invalidateLeadDetailCache(queryClient, leadId)),
    );
  }

  await Promise.all(
    leadIds.map((leadId) => invalidateLeadActivitiesTimeline(queryClient, leadId)),
  );
}

/**
 * Targeted realtime updates for the open lead panel.
 * Comment/reminder/activity events patch React Query caches instead of refetching
 * the full lead record (which made delete feel ~6s in bench).
 */
export async function handleAdminLeadPanelEvent(
  queryClient: QueryClient,
  openLeadId: string,
  event: AdminLeadPanelEvent,
  fullSync: () => Promise<void>,
): Promise<void> {
  const type = event.type ?? "";

  if (COMMENT_TIMELINE_EVENTS.has(type)) {
    await syncCommentsFromAdminEvent(queryClient, {
      ...event,
      leadId: openLeadId,
    });
    return;
  }

  if (REMINDER_TIMELINE_EVENTS.has(type)) {
    if (type === "reminder_deleted" && event.reminderId) {
      await queryClient.cancelQueries({
        queryKey: ["reminders", openLeadId],
        exact: true,
      });
      patchReminderDeletedInCache(queryClient, openLeadId, event.reminderId);
      void invalidateLeadActivitiesTimeline(queryClient, openLeadId);
      return;
    }
    await invalidateLeadRemindersTimeline(queryClient, openLeadId);
    await invalidateLeadActivitiesTimeline(queryClient, openLeadId);
    return;
  }

  if (CALL_TIMELINE_EVENTS.has(type)) {
    await invalidateLeadActivitiesTimeline(queryClient, openLeadId);
    void invalidateLeadDetailCache(queryClient, openLeadId);
    return;
  }

  if (isActivityTimelineAdminEvent(type) && adminEventTouchesLead(event, openLeadId)) {
    await syncActivityTimelineFromAdminEvent(queryClient, event);
    return;
  }

  await fullSync();
}

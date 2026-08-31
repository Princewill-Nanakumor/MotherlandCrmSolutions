import type { QueryClient } from "@tanstack/react-query";

export type AdminLeadPanelEvent = {
  type?: string;
  leadId?: string;
  leadIds?: string[];
  commentId?: string;
  reminderId?: string;
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

/** Admin Ably events that only touch comment/reminder detail caches — not the full leads list. */
export function isTimelineChurnAdminEvent(type: string): boolean {
  return COMMENT_TIMELINE_EVENTS.has(type) || REMINDER_TIMELINE_EVENTS.has(type);
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

/**
 * Targeted realtime updates for the open lead panel.
 * Comment/reminder events patch React Query caches instead of refetching
 * comments + activities + lead (which made delete feel ~6s in bench).
 */
export async function handleAdminLeadPanelEvent(
  queryClient: QueryClient,
  openLeadId: string,
  event: AdminLeadPanelEvent,
  fullSync: () => Promise<void>,
): Promise<void> {
  const type = event.type ?? "";

  if (type === "comment_deleted" && event.commentId) {
    queryClient.setQueryData(
      ["comments", openLeadId],
      (old: Array<{ _id: string }> | undefined) =>
        (old ?? []).filter((comment) => comment._id !== event.commentId),
    );
    return;
  }

  if (type === "comment_created" || type === "comment_updated") {
    await queryClient.invalidateQueries({
      queryKey: ["comments", openLeadId],
      exact: true,
    });
    return;
  }

  if (REMINDER_TIMELINE_EVENTS.has(type)) {
    if (type === "reminder_deleted" && event.reminderId) {
      queryClient.setQueryData(
        ["reminders", openLeadId],
        (old: Array<{ _id: string }> | undefined) =>
          (old ?? []).filter((reminder) => reminder._id !== event.reminderId),
      );
    } else {
      await queryClient.invalidateQueries({
        queryKey: ["reminders", openLeadId],
        exact: true,
      });
    }
    queryClient.invalidateQueries({
      queryKey: ["activities", openLeadId],
      refetchType: "none",
    });
    return;
  }

  if (COMMENT_TIMELINE_EVENTS.has(type)) {
    return;
  }

  await fullSync();
}

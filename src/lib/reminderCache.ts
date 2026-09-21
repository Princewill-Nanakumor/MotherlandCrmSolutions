import type { QueryClient } from "@tanstack/react-query";
import { viewerKnowsLead, type TimelineRefreshOptions } from "@/lib/leadTimelineAccess";
import { upsertTimelineRowsById } from "@/lib/timelineCacheMerge";
import type { Reminder } from "@/types/leads";

export function reminderRecordId(reminder: {
  _id?: unknown;
  id?: unknown;
}): string {
  const raw = reminder._id ?? reminder.id ?? "";
  if (raw && typeof raw === "object") {
    const oid = (raw as { $oid?: string }).$oid;
    if (oid) return String(oid);
  }
  return String(raw);
}

export function removeReminderFromList<T extends { _id?: unknown; id?: unknown }>(
  reminders: T[] | undefined,
  reminderId: string,
): T[] {
  const id = String(reminderId);
  return (reminders ?? []).filter((reminder) => reminderRecordId(reminder) !== id);
}

export function replaceReminderInList(
  reminders: Reminder[] | undefined,
  next: Reminder,
): Reminder[] {
  const list = reminders ?? [];
  if (!reminderRecordId(next)) return list;
  const id = reminderRecordId(next);
  const index = list.findIndex((reminder) => reminderRecordId(reminder) === id);
  if (index === -1) return [next, ...list];
  const copy = [...list];
  copy[index] = next;
  return copy;
}

export function upsertReminderInList(
  reminders: Reminder[] | undefined,
  next: Reminder,
): Reminder[] {
  const list = reminders ?? [];
  if (!reminderRecordId(next)) return list;
  const id = reminderRecordId(next);
  const without = list.filter((reminder) => reminderRecordId(reminder) !== id);
  return [next, ...without];
}

export function pendingReminderCount(reminders: Reminder[] | undefined): number {
  return (reminders ?? []).filter(
    (reminder) => reminder.status === "PENDING" || reminder.status === "SNOOZED",
  ).length;
}

const DUE_REMINDERS_REFETCH_MAX_MS = 24 * 60 * 60 * 1000;

/** Refresh the in-app alarm list now, and again when `dueAt` is reached. */
export function refreshDueRemindersQuery(
  queryClient: QueryClient,
  dueAt?: Date | string | null,
): void {
  queryClient.invalidateQueries({ queryKey: ["dueReminders"] });
  if (!dueAt) return;
  const delay = new Date(dueAt).getTime() - Date.now();
  if (!Number.isFinite(delay) || delay <= 0 || delay > DUE_REMINDERS_REFETCH_MAX_MS) {
    return;
  }
  globalThis.setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["dueReminders"] });
  }, delay);
}

export function patchReminderDeletedInCache(
  queryClient: QueryClient,
  leadId: string,
  reminderId: string,
): void {
  if (!leadId || !reminderId) return;
  queryClient.setQueryData<Reminder[]>(["reminders", leadId], (old) =>
    removeReminderFromList(old, reminderId),
  );
}

/** Write fresh reminders into cache for open AND closed panels. */
export async function refreshRemindersCacheForLead(
  queryClient: QueryClient,
  leadId: string,
  options?: TimelineRefreshOptions,
): Promise<Reminder[] | null> {
  if (!leadId) return null;
  if (!options?.force && !viewerKnowsLead(queryClient, leadId)) return null;

  try {
    const response = await fetch(`/api/leads/${leadId}/reminders`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const reminders = (Array.isArray(data) ? data : []) as Reminder[];
    let merged = reminders;
    queryClient.setQueryData(
      ["reminders", leadId],
      (old: Reminder[] | undefined) => {
        merged = upsertTimelineRowsById(old, reminders, reminderRecordId);
        return merged;
      },
    );
    return merged;
  } catch {
    return null;
  }
}

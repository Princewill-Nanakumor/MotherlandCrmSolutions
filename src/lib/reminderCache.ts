import type { QueryClient } from "@tanstack/react-query";
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

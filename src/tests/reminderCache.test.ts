import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { Reminder } from "@/types/leads";
import {
  patchReminderDeletedInCache,
  pendingReminderCount,
  reminderRecordId,
  removeReminderFromList,
  replaceReminderInList,
  upsertReminderInList,
} from "@/lib/reminderCache";

function reminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    _id: "rem-1",
    title: "Follow-up",
    reminderDate: "2026-08-25T00:00:00.000Z",
    reminderTime: "14:30",
    type: "CALL",
    status: "PENDING",
    leadId: "lead-1",
    createdBy: { _id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    assignedTo: { _id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    adminId: "admin-1",
    notificationSent: false,
    soundEnabled: true,
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-24T10:00:00.000Z",
    timezone: "UTC",
    dueAt: "2026-08-25T14:30:00.000Z",
    ...overrides,
  };
}

describe("reminderCache", () => {
  it("normalizes string, object, and $oid reminder ids", () => {
    expect(reminderRecordId({ _id: "rem-1" })).toBe("rem-1");
    expect(reminderRecordId({ id: "rem-2" })).toBe("rem-2");
    expect(reminderRecordId({ _id: { $oid: "abc" } })).toBe("abc");
  });

  it("removes a reminder even when cached _id is an object", () => {
    const list = [
      reminder({ _id: { $oid: "rem-1" } as unknown as string }),
      reminder({ _id: "rem-2", title: "Keep" }),
    ];
    expect(removeReminderFromList(list, "rem-1").map((row) => row.title)).toEqual([
      "Keep",
    ]);
  });

  it("drops the pending badge count after delete", () => {
    const remaining = removeReminderFromList(
      [reminder(), reminder({ _id: "rem-done", status: "COMPLETED" })],
      "rem-1",
    );
    expect(pendingReminderCount(remaining)).toBe(0);
  });

  it("upserts a created reminder at the front without duplicating", () => {
    const created = reminder({ _id: "rem-new", title: "New" });
    const next = upsertReminderInList([reminder()], created);
    expect(next[0]?.title).toBe("New");
    expect(upsertReminderInList(next, created)).toHaveLength(2);
  });

  it("replaces an updated reminder in place", () => {
    const next = replaceReminderInList(
      [reminder()],
      reminder({ title: "Renamed", status: "SNOOZED" }),
    );
    expect(next).toHaveLength(1);
    expect(next[0]?.title).toBe("Renamed");
    expect(next[0]?.status).toBe("SNOOZED");
  });

  it("patches the reminders query cache on delete", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["reminders", "lead-1"], [
      reminder(),
      reminder({ _id: "rem-2", title: "Other" }),
    ]);
    patchReminderDeletedInCache(queryClient, "lead-1", "rem-1");
    expect(
      queryClient.getQueryData<Reminder[]>(["reminders", "lead-1"])?.map(
        (row) => row._id,
      ),
    ).toEqual(["rem-2"]);
  });
});

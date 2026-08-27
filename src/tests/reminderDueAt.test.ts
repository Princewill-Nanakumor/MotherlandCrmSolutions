import { describe, expect, it } from "vitest";
import {
  computeReminderDueAt,
  formatLocalDateYmd,
  isReminderDue,
  reminderDateToYmd,
} from "@/lib/reminderDueAt";

describe("reminderDateToYmd", () => {
  it("extracts UTC calendar date", () => {
    expect(reminderDateToYmd("2026-08-05T15:30:00.000Z")).toBe("2026-08-05");
  });
});

describe("formatLocalDateYmd", () => {
  it("formats a fixed local date", () => {
    const d = new Date(2026, 7, 5, 12, 0, 0); // Aug 5, 2026 local
    expect(formatLocalDateYmd(d)).toBe("2026-08-05");
  });
});

describe("computeReminderDueAt", () => {
  it("converts Israel local time to a UTC instant", () => {
    const due = computeReminderDueAt("2026-01-15", "14:30", "Asia/Jerusalem");
    expect(due.toISOString()).toBe("2026-01-15T12:30:00.000Z");
  });
});

describe("isReminderDue", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");

  it("returns false for non-pending statuses", () => {
    expect(
      isReminderDue(
        {
          status: "COMPLETED",
          reminderDate: "2026-08-01",
          reminderTime: "10:00",
          dueAt: "2026-08-01T10:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("is due when dueAt is in the past", () => {
    expect(
      isReminderDue(
        {
          status: "PENDING",
          reminderDate: "2026-08-01",
          reminderTime: "10:00",
          dueAt: "2026-08-05T11:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("is not due when dueAt is in the future", () => {
    expect(
      isReminderDue(
        {
          status: "PENDING",
          reminderDate: "2026-08-06",
          reminderTime: "10:00",
          dueAt: "2026-08-05T13:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("treats snoozed reminder as due when snoozedUntil passed", () => {
    expect(
      isReminderDue(
        {
          status: "SNOOZED",
          reminderDate: "2026-08-01",
          reminderTime: "10:00",
          snoozedUntil: "2026-08-05T11:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("uses legacy local context when dueAt/timezone missing", () => {
    expect(
      isReminderDue(
        {
          status: "PENDING",
          reminderDate: "2026-08-05T00:00:00.000Z",
          reminderTime: "11:00",
        },
        now,
        {
          currentDateStr: "2026-08-05",
          currentMinutes: 12 * 60,
          currentSeconds: 0,
        },
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  computeReminderDueAt,
  formatLocalDateYmd,
  formatLocalTimeHm,
  isReminderDue,
} from "@/lib/reminderDueAt";
/** Netlify reminders-cron schedule: `* * * * *` */
const CRON_INTERVAL_MS = 60_000;
/** ReminderNotifications poll when Ably is not attached */
const POLL_FALLBACK_MS = 60_000;
/** Matches ABLY_HEALTHY_POLL_MS in useAblyAwareRefetchInterval */
const ABLY_HEALTHY_POLL_MS = 12 * 60 * 1000;

function nextTickOnOrAfter(
  atMs: number,
  intervalMs: number,
  phaseMs: number,
): number {
  if (atMs <= phaseMs) return phaseMs;
  const rem = (atMs - phaseMs) % intervalMs;
  if (rem === 0) return atMs;
  return atMs + (intervalMs - rem);
}

/**
 * When the in-app alarm/toast would appear after a reminder is created.
 * Creating does not invalidate `dueReminders`; the client waits for cron+Ably
 * or the next check-due poll after `dueAt`.
 */
function whenNotificationAppears(options: {
  createdAt: Date;
  dueAt: Date;
  ablyHealthy: boolean;
  /** Last `/api/reminders/check-due` fetch. Defaults to create time. */
  lastPollAt?: Date;
  /** Cron alignment; default is UTC minute boundaries. */
  cronPhaseMs?: number;
}): {
  notifyAt: Date;
  delayFromCreateMs: number;
  delayFromDueMs: number;
  path: "cron+ably" | "poll";
} {
  const createdAtMs = options.createdAt.getTime();
  const dueAtMs = options.dueAt.getTime();
  const lastPollAt = (options.lastPollAt ?? options.createdAt).getTime();
  const cronPhaseMs = options.cronPhaseMs ?? 0;
  const pollInterval = options.ablyHealthy
    ? ABLY_HEALTHY_POLL_MS
    : POLL_FALLBACK_MS;

  const eligibleAt = Math.max(createdAtMs, dueAtMs);

  const cronAt = nextTickOnOrAfter(eligibleAt, CRON_INTERVAL_MS, cronPhaseMs);
  const nextPollAt = lastPollAt + pollInterval;
  const pollAt =
    nextPollAt >= eligibleAt
      ? nextPollAt
      : nextTickOnOrAfter(eligibleAt, pollInterval, lastPollAt);

  let notifyAtMs: number;
  let path: "cron+ably" | "poll";

  if (options.ablyHealthy) {
    notifyAtMs = Math.min(cronAt, pollAt);
    path = notifyAtMs === cronAt ? "cron+ably" : "poll";
  } else {
    notifyAtMs = pollAt;
    path = "poll";
  }

  return {
    notifyAt: new Date(notifyAtMs),
    delayFromCreateMs: notifyAtMs - createdAtMs,
    delayFromDueMs: notifyAtMs - dueAtMs,
    path,
  };
}

function fmtMs(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const s = Math.floor(abs / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${sign}${rem}s`;
  return `${sign}${m}m ${rem}s`;
}

describe("reminder notification timing", () => {
  it("does not ring at create time when the scheduled minute is still in the future", () => {
    const createdAt = new Date("2026-08-24T15:31:22.000Z"); // 18:31:22 Israel
    const dueAt = computeReminderDueAt(
      "2026-08-24",
      "18:32",
      "Asia/Jerusalem",
    );

    expect(dueAt.toISOString()).toBe("2026-08-24T15:32:00.000Z");
    expect(
      isReminderDue(
        {
          status: "PENDING",
          reminderDate: "2026-08-24",
          reminderTime: "18:32",
          dueAt,
          timezone: "Asia/Jerusalem",
        },
        createdAt,
      ),
    ).toBe(false);

    const withAbly = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: true,
    });
    const withoutAbly = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: false,
    });

    expect(withAbly.path).toBe("cron+ably");
    expect(withAbly.notifyAt.toISOString()).toBe("2026-08-24T15:32:00.000Z");
    expect(withAbly.delayFromCreateMs).toBe(38_000);
    expect(withAbly.delayFromDueMs).toBe(0);

    expect(withoutAbly.path).toBe("poll");
    expect(withoutAbly.notifyAt.toISOString()).toBe(
      "2026-08-24T15:32:22.000Z",
    );
    expect(withoutAbly.delayFromCreateMs).toBe(60_000);
    expect(withoutAbly.delayFromDueMs).toBe(22_000);
  });

  it("rings after the next cron/poll when the form time is already due (current minute)", () => {
    const createdAt = new Date("2026-08-24T15:31:22.000Z");
    const dueAt = computeReminderDueAt(
      "2026-08-24",
      "18:31",
      "Asia/Jerusalem",
    );

    expect(dueAt.toISOString()).toBe("2026-08-24T15:31:00.000Z");
    expect(dueAt.getTime()).toBeLessThan(createdAt.getTime());
    expect(
      isReminderDue(
        {
          status: "PENDING",
          reminderDate: "2026-08-24",
          reminderTime: "18:31",
          dueAt,
          timezone: "Asia/Jerusalem",
        },
        createdAt,
      ),
    ).toBe(true);

    const withAbly = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: true,
    });
    const withoutAbly = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: false,
    });

    // Already due, but create does not refetch dueReminders. Next UTC minute cron.
    expect(withAbly.notifyAt.toISOString()).toBe("2026-08-24T15:32:00.000Z");
    expect(withAbly.delayFromCreateMs).toBe(38_000);
    expect(withoutAbly.notifyAt.toISOString()).toBe(
      "2026-08-24T15:32:22.000Z",
    );
    expect(withoutAbly.delayFromCreateMs).toBe(60_000);
  });

  it("waits up to one cron minute after dueAt in the worst Ably case", () => {
    const createdAt = new Date("2026-08-24T15:31:01.000Z");
    // 1ms after a UTC-minute cron tick so the dispatcher misses this second
    const dueAt = new Date("2026-08-24T15:32:00.001Z");

    const result = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: true,
    });

    expect(result.path).toBe("cron+ably");
    expect(result.notifyAt.toISOString()).toBe("2026-08-24T15:33:00.000Z");
    expect(result.delayFromDueMs).toBe(CRON_INTERVAL_MS - 1);
    expect(result.delayFromDueMs).toBeLessThan(CRON_INTERVAL_MS);
  });

  it("runs a live clock scenario: schedule the next local minute and report ring delay", () => {
    const createdAt = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nextMinute = new Date(createdAt.getTime());
    nextMinute.setSeconds(0, 0);
    nextMinute.setMinutes(nextMinute.getMinutes() + 1);

    const dateStr = formatLocalDateYmd(nextMinute);
    const timeStr = formatLocalTimeHm(nextMinute);
    const dueAt = computeReminderDueAt(dateStr, timeStr, tz);

    expect(
      isReminderDue(
        {
          status: "PENDING",
          reminderDate: dateStr,
          reminderTime: timeStr,
          dueAt,
          timezone: tz,
        },
        createdAt,
      ),
    ).toBe(false);

    const withAbly = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: true,
    });
    const withoutAbly = whenNotificationAppears({
      createdAt,
      dueAt,
      ablyHealthy: false,
    });

    expect(withAbly.delayFromCreateMs).toBeGreaterThan(0);
    expect(withAbly.delayFromCreateMs).toBeLessThanOrEqual(120_000);
    expect(withAbly.delayFromDueMs).toBeGreaterThanOrEqual(0);
    expect(withAbly.delayFromDueMs).toBeLessThan(CRON_INTERVAL_MS);
    expect(withoutAbly.delayFromCreateMs).toBeGreaterThanOrEqual(60_000);
    expect(withoutAbly.delayFromCreateMs).toBeLessThanOrEqual(120_000);

    // Printed so the run output shows the concrete times for this machine.
    console.log(
      [
        "",
        "Live reminder ring test",
        `  timezone:           ${tz}`,
        `  created at:         ${createdAt.toISOString()}`,
        `  scheduled local:    ${dateStr} ${timeStr}`,
        `  dueAt (UTC):        ${dueAt.toISOString()}`,
        `  wait until due:     ${fmtMs(dueAt.getTime() - createdAt.getTime())}`,
        `  Ably on → rings at: ${withAbly.notifyAt.toISOString()} (path ${withAbly.path})`,
        `    after create:     ${fmtMs(withAbly.delayFromCreateMs)}`,
        `    after due:        ${fmtMs(withAbly.delayFromDueMs)}`,
        `  Ably off → rings at:${withoutAbly.notifyAt.toISOString()} (path ${withoutAbly.path})`,
        `    after create:     ${fmtMs(withoutAbly.delayFromCreateMs)}`,
        `    after due:        ${fmtMs(withoutAbly.delayFromDueMs)}`,
        "",
      ].join("\n"),
    );
  });
});

/**
 * Compute and evaluate reminder due times using a stored UTC instant (`dueAt`)
 * when available, with legacy fallbacks for older records.
 */

export function formatLocalDateYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatLocalTimeHm(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** Calendar date (YYYY-MM-DD) from a stored reminderDate value. */
export function reminderDateToYmd(reminderDate: Date | string): string {
  const d = new Date(reminderDate);
  return d.toISOString().split("T")[0];
}

/**
 * Convert a local calendar date + time in an IANA timezone to a UTC instant.
 */
export function computeReminderDueAt(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const tz = timeZone.trim() || "UTC";

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(utcMs));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);

    const tzYear = get("year");
    const tzMonth = get("month");
    const tzDay = get("day");
    let tzHour = get("hour");
    const tzMinute = get("minute");
    // Intl may return hour 24 at midnight in some locales
    if (tzHour === 24) tzHour = 0;

    if (
      tzYear === year &&
      tzMonth === month &&
      tzDay === day &&
      tzHour === hour &&
      tzMinute === minute
    ) {
      return new Date(utcMs);
    }

    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actual = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
    utcMs += desired - actual;
  }

  return new Date(utcMs);
}

export type ReminderDueFields = {
  status: string;
  dueAt?: Date | string | null;
  reminderDate: Date | string;
  reminderTime: string;
  snoozedUntil?: Date | string | null;
  timezone?: string | null;
};

function legacyIsDueWithLocalContext(
  reminder: ReminderDueFields,
  currentDateStr: string,
  currentMinutes: number,
  currentSeconds: number,
): boolean {
  const reminderDateStr = reminderDateToYmd(reminder.reminderDate);
  if (reminderDateStr > currentDateStr) return false;
  if (reminderDateStr < currentDateStr) return true;

  const [reminderHour, reminderMinute] = reminder.reminderTime
    .split(":")
    .map(Number);
  const reminderMinutes = reminderHour * 60 + reminderMinute;
  const bufferMinutes = currentSeconds >= 30 ? 0.5 : 0;
  return reminderMinutes <= currentMinutes + bufferMinutes;
}

function resolveDueAt(reminder: ReminderDueFields): Date | null {
  if (reminder.dueAt) {
    const d = new Date(reminder.dueAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (reminder.timezone) {
    return computeReminderDueAt(
      reminderDateToYmd(reminder.reminderDate),
      reminder.reminderTime,
      reminder.timezone,
    );
  }
  return null;
}

/**
 * Returns true when a reminder should fire now.
 * - `dueAt` (or timezone-derived dueAt) uses absolute UTC comparison.
 * - Legacy records without timezone use calendar date + local context.
 */
export function isReminderDue(
  reminder: ReminderDueFields,
  now: Date = new Date(),
  localContext?: {
    currentDateStr: string;
    currentMinutes: number;
    currentSeconds: number;
  },
): boolean {
  if (reminder.status === "SNOOZED") {
    return !!reminder.snoozedUntil && new Date(reminder.snoozedUntil) <= now;
  }
  if (reminder.status !== "PENDING") return false;

  const dueAt = resolveDueAt(reminder);
  if (dueAt) {
    return dueAt <= now;
  }

  if (localContext) {
    return legacyIsDueWithLocalContext(
      reminder,
      localContext.currentDateStr,
      localContext.currentMinutes,
      localContext.currentSeconds,
    );
  }

  // Cron fallback: server clock vs stored date/time (legacy only)
  const currentDateStr = now.toISOString().split("T")[0];
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const currentSeconds = now.getUTCSeconds();
  return legacyIsDueWithLocalContext(
    reminder,
    currentDateStr,
    currentMinutes,
    currentSeconds,
  );
}

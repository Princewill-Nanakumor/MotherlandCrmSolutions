import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  getPaymentExpiresAt,
  isPaymentConfirmWindowExpired,
  PAYMENT_CONFIRM_WINDOW_MS,
  resolvePaymentExpiresAt,
} from "./paymentConfirmWindow";

describe("getPaymentExpiresAt", () => {
  it("adds one hour to the start time", () => {
    const from = new Date("2026-08-05T10:00:00.000Z");
    expect(getPaymentExpiresAt(from).toISOString()).toBe(
      "2026-08-05T11:00:00.000Z",
    );
    expect(PAYMENT_CONFIRM_WINDOW_MS).toBe(60 * 60 * 1000);
  });
});

describe("resolvePaymentExpiresAt", () => {
  it("prefers explicit expiresAt", () => {
    const deadline = resolvePaymentExpiresAt({
      expiresAt: "2026-08-05T12:00:00.000Z",
      createdAt: "2026-08-05T10:00:00.000Z",
    });
    expect(deadline?.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("falls back to createdAt + window", () => {
    const deadline = resolvePaymentExpiresAt({
      createdAt: "2026-08-05T10:00:00.000Z",
    });
    expect(deadline?.toISOString()).toBe("2026-08-05T11:00:00.000Z");
  });

  it("returns null when nothing usable", () => {
    expect(resolvePaymentExpiresAt({})).toBeNull();
  });
});

describe("isPaymentConfirmWindowExpired", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");

  it("is expired at or after deadline", () => {
    expect(isPaymentConfirmWindowExpired("2026-08-05T12:00:00.000Z", now)).toBe(
      true,
    );
  });

  it("is not expired before deadline", () => {
    expect(isPaymentConfirmWindowExpired("2026-08-05T12:01:00.000Z", now)).toBe(
      false,
    );
  });

  it("returns false when expiresAt missing", () => {
    expect(isPaymentConfirmWindowExpired(null, now)).toBe(false);
  });
});

describe("formatCountdown", () => {
  it("formats minutes and seconds", () => {
    expect(formatCountdown(125_000)).toBe("02:05");
  });

  it("formats hours when needed", () => {
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
  });

  it("clamps negative values to zero", () => {
    expect(formatCountdown(-500)).toBe("00:00");
  });
});

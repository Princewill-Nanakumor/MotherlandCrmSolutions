import { describe, expect, it } from "vitest";
import {
  formatLeadPhoneForTable,
  normalizePhoneToE164,
} from "./phoneNormalize";

describe("normalizePhoneToE164", () => {
  it("returns empty for blank input", () => {
    expect(normalizePhoneToE164("")).toBe("");
    expect(normalizePhoneToE164(null)).toBe("");
  });

  it("keeps valid international numbers in E.164", () => {
    expect(normalizePhoneToE164("+1 555 123 4567")).toMatch(/^\+/);
  });

  it("converts 00 prefix to +", () => {
    const result = normalizePhoneToE164("00491701234567");
    expect(result.startsWith("+")).toBe(true);
  });

  it("uses country hint for national numbers", () => {
    const result = normalizePhoneToE164("1701234567", "DE");
    expect(result).toMatch(/^\+49/);
  });

  it("avoids duplicating country calling code already in digits", () => {
    const result = normalizePhoneToE164("491701234567", "DE");
    expect(result).toBe("+491701234567");
  });
});

describe("formatLeadPhoneForTable", () => {
  it("shows dash for empty phone", () => {
    expect(formatLeadPhoneForTable("")).toBe("—");
  });

  it("masks when canViewFull is false", () => {
    expect(
      formatLeadPhoneForTable("+15551234567", {
        canViewFull: false,
        mask: (v) => `masked:${v.slice(-4)}`,
      }),
    ).toBe("masked:4567");
  });
});

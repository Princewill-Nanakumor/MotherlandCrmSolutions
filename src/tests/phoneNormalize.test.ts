import { describe, expect, it } from "vitest";
import {
  coercePhoneImportValue,
  expandScientificNumericString,
  formatLeadPhoneForTable,
  normalizePhoneToE164,
} from "@/lib/phoneNormalize";

describe("coercePhoneImportValue", () => {
  it("keeps safe integer phone numbers as digit strings", () => {
    expect(coercePhoneImportValue(353894792905)).toBe("353894792905");
    expect(coercePhoneImportValue(353872595184)).toBe("353872595184");
  });

  it("expands scientific notation from Excel/CSV text", () => {
    expect(coercePhoneImportValue("3.53894792905E+11")).toBe("353894792905");
    expect(expandScientificNumericString("3.53895E+11")).toBe("353895000000");
  });
});

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

  it("recovers scientific notation before normalizing", () => {
    expect(normalizePhoneToE164("3.53894792905E+11")).toContain("353894792905");
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

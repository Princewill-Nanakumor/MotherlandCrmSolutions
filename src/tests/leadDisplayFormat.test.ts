import { describe, expect, it } from "vitest";
import {
  formatLeadDetailSource,
  isProvidedLeadSource,
  MANUAL_SOURCE_SELECT_VALUE,
  normalizeLeadSource,
} from "@/lib/leadDisplayFormat";

describe("isProvidedLeadSource", () => {
  it("rejects blank and placeholder values", () => {
    expect(isProvidedLeadSource("")).toBe(false);
    expect(isProvidedLeadSource("   ")).toBe(false);
    expect(isProvidedLeadSource("-")).toBe(false);
    expect(isProvidedLeadSource("—")).toBe(false);
    expect(isProvidedLeadSource(MANUAL_SOURCE_SELECT_VALUE)).toBe(false);
    expect(isProvidedLeadSource(null)).toBe(false);
    expect(isProvidedLeadSource(undefined)).toBe(false);
  });

  it("accepts real source names", () => {
    expect(isProvidedLeadSource("Facebook Ads")).toBe(true);
    expect(isProvidedLeadSource("Manual Entry")).toBe(true);
  });
});

describe("normalizeLeadSource", () => {
  it("title-cases lowercase import sources", () => {
    expect(normalizeLeadSource("facebook ads")).toBe("Facebook Ads");
    expect(normalizeLeadSource("GOOGLE")).toBe("Google");
    expect(normalizeLeadSource("excel")).toBe("Excel");
  });

  it("preserves empty placeholders", () => {
    expect(normalizeLeadSource("")).toBe("—");
    expect(normalizeLeadSource("-")).toBe("—");
    expect(normalizeLeadSource("—")).toBe("—");
    expect(normalizeLeadSource(MANUAL_SOURCE_SELECT_VALUE)).toBe("—");
  });

  it("capitalizes hyphenated and dashed sources", () => {
    expect(formatLeadDetailSource("facebook - landing")).toBe(
      "Facebook - Landing",
    );
    expect(formatLeadDetailSource("meta-ads")).toBe("Meta-Ads");
  });
});

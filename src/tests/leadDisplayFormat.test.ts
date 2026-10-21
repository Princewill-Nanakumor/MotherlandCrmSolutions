import { describe, expect, it } from "vitest";
import {
  formatLeadDetailSource,
  normalizeLeadSource,
} from "@/lib/leadDisplayFormat";

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
  });

  it("capitalizes hyphenated and dashed sources", () => {
    expect(formatLeadDetailSource("facebook - landing")).toBe(
      "Facebook - Landing",
    );
    expect(formatLeadDetailSource("meta-ads")).toBe("Meta-Ads");
  });
});

import { describe, expect, it } from "vitest";
import {
  countriesMatch,
  expandCountryFilterValues,
  normalizeCountryInput,
} from "@/lib/countryNormalize";

describe("normalizeCountryInput", () => {
  it("maps ISO code to display name", () => {
    expect(normalizeCountryInput("US")).toBe("United States");
  });

  it("maps common aliases", () => {
    expect(normalizeCountryInput("usa")).toBe("United States");
    expect(normalizeCountryInput("UK")).toBe("United Kingdom");
    expect(normalizeCountryInput("UAE")).toBe("United Arab Emirates");
  });

  it("returns empty for blank input", () => {
    expect(normalizeCountryInput("  ")).toBe("");
    expect(normalizeCountryInput(null)).toBe("");
  });

  it("returns unknown values trimmed as-is", () => {
    expect(normalizeCountryInput("  Narnia  ")).toBe("Narnia");
  });
});

describe("countriesMatch", () => {
  it("matches alias against canonical", () => {
    expect(countriesMatch("United States", "US")).toBe(true);
    expect(countriesMatch("usa", "United States")).toBe(true);
  });

  it("returns true when filter is empty", () => {
    expect(countriesMatch("Israel", "")).toBe(true);
  });

  it("returns false when lead country is empty and filter is set", () => {
    expect(countriesMatch("", "Israel")).toBe(false);
  });

  it("returns false for unrelated countries", () => {
    expect(countriesMatch("Israel", "Germany")).toBe(false);
  });
});

describe("expandCountryFilterValues", () => {
  it("includes aliases for a selection", () => {
    const expanded = expandCountryFilterValues(["US"]);
    expect(expanded).toEqual(
      expect.arrayContaining(["US", "United States", "USA"]),
    );
  });
});

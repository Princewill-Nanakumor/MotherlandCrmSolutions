import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAD_PAGE_SIZE,
  LEAD_PAGE_SIZE_OPTIONS,
  MAX_LEAD_PAGE_SIZE,
  leadEntriesRange,
  parseLeadPageSize,
  parseLeadPageSizeOption,
} from "@/lib/leadPageSize";

describe("LEAD_PAGE_SIZE_OPTIONS", () => {
  it("is even numbers from 20 to 500", () => {
    expect(LEAD_PAGE_SIZE_OPTIONS[0]).toBe(20);
    expect(LEAD_PAGE_SIZE_OPTIONS.at(-1)).toBe(500);
    expect(LEAD_PAGE_SIZE_OPTIONS.every((size) => size % 2 === 0)).toBe(true);
    expect(LEAD_PAGE_SIZE_OPTIONS).toHaveLength(25);
  });
});

describe("parseLeadPageSize", () => {
  it("defaults to 20 and clamps to 500", () => {
    expect(parseLeadPageSize(null)).toBe(DEFAULT_LEAD_PAGE_SIZE);
    expect(parseLeadPageSize("20")).toBe(20);
    expect(parseLeadPageSize("9999")).toBe(MAX_LEAD_PAGE_SIZE);
  });
});

describe("parseLeadPageSizeOption", () => {
  it("snaps leftover sizes onto the Show list", () => {
    expect(parseLeadPageSizeOption("15")).toBe(20);
    expect(parseLeadPageSizeOption("30")).toBe(40);
    expect(parseLeadPageSizeOption("40")).toBe(40);
  });
});

describe("leadEntriesRange", () => {
  it("matches all-leads empty and first-page math", () => {
    expect(leadEntriesRange(0, 20, 0)).toEqual({ start: 0, end: 0 });
    expect(leadEntriesRange(0, 20, 12876)).toEqual({ start: 1, end: 20 });
    expect(leadEntriesRange(1, 20, 35)).toEqual({ start: 21, end: 35 });
  });
});

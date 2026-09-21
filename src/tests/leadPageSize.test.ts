import { describe, expect, it } from "vitest";
import {
  ALL_LEADS_MAX_PAGE_SIZE,
  ALL_LEADS_PAGE_SIZE_OPTIONS,
  DEFAULT_LEAD_PAGE_SIZE,
  LEAD_PAGE_SIZE_OPTIONS,
  MAX_LEAD_PAGE_SIZE,
  leadEntriesRange,
  parseAllLeadsPageSizeOption,
  parseLeadPageSize,
  parseLeadPageSizeOption,
  snapAllLeadsPageSize,
} from "@/lib/leadPageSize";

describe("LEAD_PAGE_SIZE_OPTIONS", () => {
  it("is even numbers from 20 to 500", () => {
    expect(LEAD_PAGE_SIZE_OPTIONS[0]).toBe(20);
    expect(LEAD_PAGE_SIZE_OPTIONS.at(-1)).toBe(500);
    expect(LEAD_PAGE_SIZE_OPTIONS.every((size) => size % 2 === 0)).toBe(true);
    expect(LEAD_PAGE_SIZE_OPTIONS).toHaveLength(25);
  });
});

describe("ALL_LEADS_PAGE_SIZE_OPTIONS", () => {
  it("is even numbers from 20 to 1000 including 480 and 500", () => {
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS[0]).toBe(20);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS).toContain(480);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS).toContain(500);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS).toContain(520);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS.at(-1)).toBe(1000);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS.every((size) => size % 20 === 0)).toBe(
      true,
    );
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS).toHaveLength(50);
  });
});

describe("parseLeadPageSize", () => {
  it("defaults to 20 and clamps to 500", () => {
    expect(parseLeadPageSize(null)).toBe(DEFAULT_LEAD_PAGE_SIZE);
    expect(parseLeadPageSize("20")).toBe(20);
    expect(parseLeadPageSize("9999")).toBe(MAX_LEAD_PAGE_SIZE);
  });

  it("clamps all-leads API sizes to 1000", () => {
    expect(parseLeadPageSize("1000", ALL_LEADS_MAX_PAGE_SIZE)).toBe(1000);
    expect(parseLeadPageSize("9999", ALL_LEADS_MAX_PAGE_SIZE)).toBe(
      ALL_LEADS_MAX_PAGE_SIZE,
    );
  });
});

describe("parseLeadPageSizeOption", () => {
  it("snaps leftover sizes onto the Show list", () => {
    expect(parseLeadPageSizeOption("15")).toBe(20);
    expect(parseLeadPageSizeOption("30")).toBe(40);
    expect(parseLeadPageSizeOption("40")).toBe(40);
    expect(parseLeadPageSizeOption("600")).toBe(MAX_LEAD_PAGE_SIZE);
  });
});

describe("parseAllLeadsPageSizeOption", () => {
  it("snaps onto the all-leads list through 1000", () => {
    expect(parseAllLeadsPageSizeOption("480")).toBe(480);
    expect(parseAllLeadsPageSizeOption("500")).toBe(500);
    expect(parseAllLeadsPageSizeOption("510")).toBe(520);
    expect(parseAllLeadsPageSizeOption("1000")).toBe(1000);
    expect(parseAllLeadsPageSizeOption("9999")).toBe(ALL_LEADS_MAX_PAGE_SIZE);
    expect(snapAllLeadsPageSize(800)).toBe(800);
  });
});

describe("leadEntriesRange", () => {
  it("matches all-leads empty and first-page math", () => {
    expect(leadEntriesRange(0, 20, 0)).toEqual({ start: 0, end: 0 });
    expect(leadEntriesRange(0, 20, 12876)).toEqual({ start: 1, end: 20 });
    expect(leadEntriesRange(1, 20, 35)).toEqual({ start: 21, end: 35 });
  });
});

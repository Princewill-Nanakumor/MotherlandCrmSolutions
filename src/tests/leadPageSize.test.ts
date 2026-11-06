import { describe, expect, it } from "vitest";
import {
  ALL_LEADS_MAX_PAGE_SIZE,
  ALL_LEADS_PAGE_SIZE_OPTIONS,
  DEFAULT_LEAD_PAGE_SIZE,
  LEAD_PAGE_SIZE_OPTIONS,
  MAX_LEAD_PAGE_SIZE,
  SUBADMIN_LEAD_PAGE_SIZE_OPTIONS,
  SUBADMIN_MAX_LEAD_PAGE_SIZE,
  leadEntriesRange,
  maxMyLeadsPageSizeForRole,
  parseAllLeadsPageSizeOption,
  parseLeadPageSize,
  parseLeadPageSizeOption,
  snapAllLeadsPageSize,
} from "@/lib/leadPageSize";

describe("LEAD_PAGE_SIZE_OPTIONS", () => {
  it("is even numbers from 20 to the agent My Leads max", () => {
    expect(LEAD_PAGE_SIZE_OPTIONS[0]).toBe(20);
    expect(LEAD_PAGE_SIZE_OPTIONS.at(-1)).toBe(MAX_LEAD_PAGE_SIZE);
    expect(LEAD_PAGE_SIZE_OPTIONS.every((size) => size % 2 === 0)).toBe(true);
    expect(LEAD_PAGE_SIZE_OPTIONS).toHaveLength(25);
  });
});

describe("SUBADMIN_LEAD_PAGE_SIZE_OPTIONS", () => {
  it("reuses the All Leads Show ladder (max 2000)", () => {
    expect(SUBADMIN_LEAD_PAGE_SIZE_OPTIONS).toBe(ALL_LEADS_PAGE_SIZE_OPTIONS);
    expect(SUBADMIN_MAX_LEAD_PAGE_SIZE).toBe(ALL_LEADS_MAX_PAGE_SIZE);
  });
});

describe("ALL_LEADS_PAGE_SIZE_OPTIONS", () => {
  it("is even numbers from 20 to the All Leads max", () => {
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS[0]).toBe(20);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS).toContain(500);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS).toContain(1000);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS.at(-1)).toBe(ALL_LEADS_MAX_PAGE_SIZE);
    expect(ALL_LEADS_PAGE_SIZE_OPTIONS.every((size) => size % 20 === 0)).toBe(
      true,
    );
  });
});

describe("maxMyLeadsPageSizeForRole", () => {
  it("keeps agents at 500 and sub-admins at the All Leads Show max", () => {
    expect(maxMyLeadsPageSizeForRole("AGENT")).toBe(500);
    expect(maxMyLeadsPageSizeForRole("SUBADMIN")).toBe(ALL_LEADS_MAX_PAGE_SIZE);
    expect(maxMyLeadsPageSizeForRole(undefined)).toBe(500);
  });
});

describe("parseLeadPageSize", () => {
  it("defaults to 20 and clamps to the agent max", () => {
    expect(parseLeadPageSize(null)).toBe(DEFAULT_LEAD_PAGE_SIZE);
    expect(parseLeadPageSize("20")).toBe(20);
    expect(parseLeadPageSize("9999")).toBe(MAX_LEAD_PAGE_SIZE);
  });

  it("clamps all-leads API sizes to the All Leads max", () => {
    expect(parseLeadPageSize("1000", ALL_LEADS_MAX_PAGE_SIZE)).toBe(1000);
    expect(parseLeadPageSize("2000", ALL_LEADS_MAX_PAGE_SIZE)).toBe(2000);
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
  it("snaps onto the all-leads list through the max", () => {
    expect(parseAllLeadsPageSizeOption("480")).toBe(480);
    expect(parseAllLeadsPageSizeOption("500")).toBe(500);
    expect(parseAllLeadsPageSizeOption("510")).toBe(520);
    expect(parseAllLeadsPageSizeOption("1000")).toBe(1000);
    expect(parseAllLeadsPageSizeOption("2000")).toBe(2000);
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

import { describe, expect, it } from "vitest";
import {
  isStatusOnlyLeadUpdate,
  mergeLeadContactExtras,
  mergeLeadContactExtrasIfSame,
  normalizeLeadStatusId,
} from "@/lib/leadClientUpdate";
import type { Lead } from "@/types/leads";

const baseLead = {
  _id: "lead-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+15551234567",
  source: "web",
  country: "United States",
  status: "NEW",
  comments: "",
  assignedTo: null,
} as unknown as Lead;

describe("normalizeLeadStatusId", () => {
  it("returns empty for nullish", () => {
    expect(normalizeLeadStatusId(null)).toBe("");
    expect(normalizeLeadStatusId(undefined)).toBe("");
  });

  it("returns strings as-is", () => {
    expect(normalizeLeadStatusId("CONTACTED")).toBe("CONTACTED");
  });

  it("reads object _id", () => {
    expect(normalizeLeadStatusId({ _id: "custom-1" })).toBe("custom-1");
  });
});

describe("isStatusOnlyLeadUpdate", () => {
  it("detects status-only changes", () => {
    expect(
      isStatusOnlyLeadUpdate(baseLead, {
        ...baseLead,
        status: "CONTACTED",
      }),
    ).toBe(true);
  });

  it("returns false when other fields also change", () => {
    expect(
      isStatusOnlyLeadUpdate(baseLead, {
        ...baseLead,
        status: "CONTACTED",
        firstName: "Augusta",
      }),
    ).toBe(false);
  });

  it("returns false when status did not change", () => {
    expect(isStatusOnlyLeadUpdate(baseLead, { ...baseLead })).toBe(false);
  });

  it("returns false when secondary emails also change", () => {
    expect(
      isStatusOnlyLeadUpdate(baseLead, {
        ...baseLead,
        status: "CONTACTED",
        emails: [{ value: "work@example.com" }],
      }),
    ).toBe(false);
  });

  it("treats omitted emails/phones as unchanged (status PATCH payloads)", () => {
    const withExtras = {
      ...baseLead,
      emails: [{ value: "work@example.com" }],
      phones: [{ value: "+15559876543" }],
    } as Lead;
    const statusOnly = {
      ...baseLead,
      status: "CONTACTED",
    } as Lead;
    delete statusOnly.emails;
    delete statusOnly.phones;

    expect(isStatusOnlyLeadUpdate(withExtras, statusOnly)).toBe(true);
  });
});

describe("mergeLeadContactExtras", () => {
  it("keeps panel extras when list row omits emails/phones", () => {
    const listRow = { ...baseLead, updatedAt: "2026-01-02" } as Lead;
    const panel = {
      ...baseLead,
      emails: [{ value: "work@example.com", label: "Work" }],
      phones: [{ value: "+15559876543" }],
    } as Lead;

    expect(mergeLeadContactExtras(listRow, panel)).toEqual({
      ...listRow,
      emails: panel.emails,
      phones: panel.phones,
    });
  });

  it("prefers explicit empty arrays from incoming (cleared extras)", () => {
    const cleared = {
      ...baseLead,
      emails: [],
      phones: [],
    } as Lead;
    const panel = {
      ...baseLead,
      emails: [{ value: "work@example.com" }],
      phones: [{ value: "+15559876543" }],
    } as Lead;

    expect(mergeLeadContactExtras(cleared, panel)).toEqual(cleared);
  });

  it("mergeLeadContactExtrasIfSame ignores richer leads with a different id", () => {
    const incoming = { ...baseLead, _id: "lead-1" } as Lead;
    const other = {
      ...baseLead,
      _id: "lead-2",
      emails: [{ value: "other@example.com" }],
    } as Lead;

    expect(mergeLeadContactExtrasIfSame(incoming, other)).toEqual(incoming);
  });
});

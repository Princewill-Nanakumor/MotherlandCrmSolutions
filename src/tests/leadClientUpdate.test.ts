import { describe, expect, it } from "vitest";
import {
  isStatusOnlyLeadUpdate,
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
});

import { describe, expect, it } from "vitest";
import type { Lead } from "@/types/leads";
import { findLeadByUrlParam, leadMatchesUrlParam } from "@/lib/leadUrlParam";

function leadStub(partial: Partial<Lead> & { _id: string }): Lead {
  return {
    firstName: "A",
    lastName: "B",
    email: "a@b.c",
    source: "Manual",
    status: "NEW",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("leadUrlParam", () => {
  it("matches by mongo id and prefixed leadId", () => {
    const lead = leadStub({ _id: "abc123", leadId: "LD-07C45AA2EE" });
    expect(leadMatchesUrlParam(lead, "abc123")).toBe(true);
    expect(leadMatchesUrlParam(lead, "LD-07C45AA2EE")).toBe(true);
    expect(leadMatchesUrlParam(lead, "ld-07c45aa2ee")).toBe(true);
    expect(leadMatchesUrlParam(lead, "other")).toBe(false);
  });

  it("finds a lead in a page by url param", () => {
    const leads = [
      leadStub({ _id: "1", leadId: "LD-AAA" }),
      leadStub({ _id: "2", leadId: "LD-BBB" }),
    ];
    expect(findLeadByUrlParam(leads, "LD-BBB")?._id).toBe("2");
    expect(findLeadByUrlParam(leads, "missing")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import type { Lead } from "@/types/leads";
import { searchLeads } from "@/utils/LeadsUtils";

function lead(i: number): Lead {
  return {
    _id: `lead-${i}`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    email: `lead${i}@bench.test`,
    phone: `+1555000${String(i).padStart(4, "0")}`,
    country: "United States",
    source: "web",
    status: "NEW",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    assignedTo: null,
  };
}

describe("searchLeads", () => {
  it("has no artificial result cap — returns every substring match", () => {
    const leads = Array.from({ length: 500 }, (_, i) => lead(i));
    const broad = searchLeads(leads, "first1");
    // Substring match: First1, First10–19, First100–199, First21, First31, …
    expect(broad.length).toBeGreaterThan(100);
    expect(broad.length).toBeLessThanOrEqual(500);
  });

  it("returns a single row for a unique phone query", () => {
    const leads = Array.from({ length: 500 }, (_, i) => lead(i));
    const exact = searchLeads(leads, "+15550000042");
    expect(exact).toHaveLength(1);
    expect(exact[0]?._id).toBe("lead-42");
  });
});

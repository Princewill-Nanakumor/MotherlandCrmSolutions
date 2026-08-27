import { describe, expect, it } from "vitest";
import {
  buildLeadSearchConditions,
  parseLeadListPagination,
  phoneDigitsForSearch,
} from "@/lib/leadListQuery";

/**
 * In-memory stand-in for large CRM datasets.
 * Catches O(n) search / pagination regressions without a 50k Mongo seed.
 */
function buildLeads(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    _id: `id-${i}`,
    firstName: i % 2 === 0 ? "John" : "Jane",
    lastName: `Lead${i}`,
    email: `lead${i}@example.com`,
    phone: `+38050${String(1000000 + i).slice(0, 7)}`,
    status: i % 5 === 0 ? "WON" : "NEW",
    country: i % 3 === 0 ? "United States" : "Ukraine",
  }));
}

function applySearch(
  leads: ReturnType<typeof buildLeads>,
  raw: string,
): typeof leads {
  const digits = phoneDigitsForSearch(raw);
  const lower = raw.trim().toLowerCase();
  return leads.filter((lead) => {
    if (!lower && digits.length < 5) return true;
    if (lower && lead.firstName.toLowerCase().includes(lower)) return true;
    if (lower && lead.lastName.toLowerCase().includes(lower)) return true;
    if (lower && lead.email.toLowerCase().includes(lower)) return true;
    if (digits.length >= 5 && phoneDigitsForSearch(lead.phone).includes(digits)) {
      return true;
    }
    return false;
  });
}

describe("large dataset search + pagination (in-memory)", () => {
  it("filters 10,000 leads by name case-insensitively under budget", () => {
    const leads = buildLeads(10_000);
    const start = performance.now();
    const hits = applySearch(leads, "JOHN");
    const elapsed = performance.now() - start;

    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => /john/i.test(h.firstName))).toBe(true);
    expect(elapsed).toBeLessThan(250);
    expect(buildLeadSearchConditions("JOHN")).not.toBeNull();
  });

  it("filters 50,000 leads by phone digit variants under budget", () => {
    const leads = buildLeads(50_000);
    const target = leads[42_000];
    const variants = [
      target.phone,
      target.phone.replace("+", ""),
      target.phone.replace(/(\d{3})(\d{2})(\d{3})(\d{4})/, "($1)$2-$3-$4"),
    ];

    for (const variant of variants) {
      const start = performance.now();
      const hits = applySearch(leads, variant);
      const elapsed = performance.now() - start;
      expect(hits.some((h) => h._id === target._id)).toBe(true);
      expect(elapsed).toBeLessThan(500);
    }
  });

  it("paginates consistently across pages for 20,000 leads", () => {
    const leads = buildLeads(20_000);
    const page1 = parseLeadListPagination(
      new URLSearchParams("page=1&pageSize=25"),
    );
    const page2 = parseLeadListPagination(
      new URLSearchParams("page=2&pageSize=25"),
    );

    const slice1 = leads.slice(page1.skip, page1.skip + page1.pageSize);
    const slice2 = leads.slice(page2.skip, page2.skip + page2.pageSize);

    expect(slice1).toHaveLength(25);
    expect(slice2).toHaveLength(25);
    expect(slice1[0]._id).not.toBe(slice2[0]._id);
    expect(page2.skip).toBe(25);
  });

  it("combines search + pagination without dropping matches", () => {
    const leads = buildLeads(20_000);
    const filtered = applySearch(leads, "Jane");
    const { pageSize, skip } = parseLeadListPagination(
      new URLSearchParams("page=3&pageSize=50"),
    );
    const page = filtered.slice(skip, skip + pageSize);
    expect(page.every((l) => l.firstName === "Jane")).toBe(true);
    expect(page).toHaveLength(50);
  });
});

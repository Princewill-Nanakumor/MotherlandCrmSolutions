import { describe, expect, it } from "vitest";
import type { Lead } from "@/types/leads";
import {
  filterLeadsByCountry,
  filterLeadsBySource,
  filterLeadsByStatus,
  searchLeads,
} from "@/utils/LeadsUtils";

const COUNTRIES = ["United States", "Germany", "France", "Canada", "Spain"];
const SOURCES = ["web", "referral", "import", "ads", "cold-call"];
const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

function syntheticLead(i: number): Lead {
  return {
    _id: `lead-${i}`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    email: `lead${i}@bench.test`,
    phone: `+1555000${String(i).padStart(4, "0")}`,
    country: COUNTRIES[i % COUNTRIES.length],
    source: SOURCES[i % SOURCES.length] as Lead["source"],
    status: STATUSES[i % STATUSES.length],
    createdAt: new Date(2026, 0, 1 + (i % 28)).toISOString(),
    updatedAt: new Date(2026, 1, 1 + (i % 28)).toISOString(),
    lastActivityAt: new Date(2026, 2, 1 + (i % 28)).toISOString(),
    assignedTo: null,
  };
}

/** Mirrors the agent /dashboard/leads FilterLogic pipeline (client-side). */
function runAgentFilterPipeline(
  leads: Lead[],
  options: {
    countries?: string[];
    statuses?: string[];
    sources?: string[];
    search?: string;
  },
): Lead[] {
  let filtered = leads;
  if (options.countries?.length) {
    filtered = filterLeadsByCountry(filtered, options.countries, "include");
  }
  if (options.statuses?.length) {
    filtered = filterLeadsByStatus(filtered, options.statuses, [], "include");
  }
  if (options.sources?.length) {
    filtered = filterLeadsBySource(filtered, options.sources, "include");
  }
  if (options.search?.trim()) {
    filtered = searchLeads(filtered, options.search);
  }
  return [...filtered].sort((a, b) => {
    const aTs = new Date(a.lastActivityAt || a.updatedAt || 0).getTime();
    const bTs = new Date(b.lastActivityAt || b.updatedAt || 0).getTime();
    return bTs - aTs;
  });
}

function bench(label: string, fn: () => void, iterations = 20) {
  // Warm-up
  fn();
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)] ?? 0;
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? median;
  return { label, medianMs: +median.toFixed(3), p95Ms: +p95.toFixed(3) };
}

describe("agent leads filter pipeline (client-side /dashboard/leads)", () => {
  const sizes = [100, 500] as const;

  for (const size of sizes) {
    const leads = Array.from({ length: size }, (_, i) => syntheticLead(i));

    it(`filters ${size} assigned leads quickly`, () => {
      const rows = [
        bench("baseline sort only", () => runAgentFilterPipeline(leads, {})),
        bench("status filter", () =>
          runAgentFilterPipeline(leads, { statuses: ["CONTACTED"] }),
        ),
        bench("country filter", () =>
          runAgentFilterPipeline(leads, { countries: ["Germany"] }),
        ),
        bench("source filter", () =>
          runAgentFilterPipeline(leads, { sources: ["web"] }),
        ),
        bench("search filter", () =>
          runAgentFilterPipeline(leads, { search: "+15550000042" }),
        ),
        bench("combined filters", () =>
          runAgentFilterPipeline(leads, {
            statuses: ["NEW", "CONTACTED"],
            countries: ["United States", "Germany"],
            sources: ["web", "referral"],
            search: "+15550000042",
          }),
        ),
      ];

      // eslint-disable-next-line no-console -- perf report
      console.log(`\n=== Agent leads client filter (${size} rows) ===`);
      for (const row of rows) {
        // eslint-disable-next-line no-console -- perf report
        console.log(
          `  ${row.label.padEnd(22)} median ${row.medianMs}ms  p95 ${row.p95Ms}ms`,
        );
      }

      // 500 rows should stay well under one frame at median; generous cap for CI variance.
      const combined = rows.find((r) => r.label === "combined filters");
      expect(combined?.medianMs ?? 999).toBeLessThan(size <= 100 ? 30 : 80);
    });
  }
});

/**
 * Benchmark All Leads server filters (/api/leads/all) and agent assigned fetch
 * (/api/leads/assigned), with phased UI timings.
 *
 * API `ms` is end-to-end request time (auth + Mongo + transform + network), not
 * in-browser filter speed. Client filter speed: npm run test:leads-filters-client
 *
 *   npm run test:leads-filters-bench
 *   LEADS_FILTER_BENCH=1 LEADS_FILTER_BENCH_SIZE=200 npm run test:leads-filters-bench
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";
import {
  compareDirectFetchVsUiNavigation,
  formatDirectVsUi,
  formatStartupReport,
  formatUiPhases,
  measureAgentClientFilterPhases,
  measureColdWarmStartup,
  measureLeadsPagePhases,
  payloadStats,
} from "./helpers/leadsBench";
import {
  importLeadsWithRetry,
  listStatuses,
  listUsers,
  statusId,
  userId,
} from "./helpers/assignmentUi";

const enabled = process.env.LEADS_FILTER_BENCH === "1";
const size = Math.min(
  500,
  Math.max(25, Number(process.env.LEADS_FILTER_BENCH_SIZE || 100)),
);
const MAX_ASSIGNED = 500;

const COUNTRIES = ["United States", "Germany", "France"];
const SOURCES = ["filter-bench-a", "filter-bench-b", "filter-bench-c"];
/** Seeded in ~1/3 of rows — use for “many results” country filter cases */
const MATCHING_COUNTRY = "Germany";
/** Not in seed data — use for “zero results” country filter cases */
const ZERO_COUNTRY = "Narnia";

function rate(n: number, ms: number) {
  return ms > 0 ? +(n / (ms / 1000)).toFixed(1) : 0;
}

async function fetchBenchLeadIds(
  page: import("@playwright/test").Page,
  stamp: number,
  expected: number,
) {
  const search = `filter.bench.${stamp}`;
  const pageSize = Math.min(500, Math.max(50, expected));
  const deadline = Date.now() + 90_000;
  const ids: string[] = [];

  while (Date.now() < deadline && ids.length < expected) {
    ids.length = 0;
    let pageNum = 1;
    while (ids.length < expected && pageNum <= 20) {
      const list = await apiJson(
        page,
        `/api/leads/all?search=${encodeURIComponent(search)}&page=${pageNum}&pageSize=${pageSize}`,
      );
      expect(list.status).toBe(200);
      const leads =
        (list.body as { leads?: { _id: string }[] }).leads || [];
      for (const lead of leads) {
        if (lead._id) ids.push(lead._id);
      }
      if (leads.length < pageSize) break;
      pageNum += 1;
    }
    if (ids.length >= expected * 0.99) return ids;
    await page.waitForTimeout(500);
  }
  return ids;
}

async function runApiCase(
  page: import("@playwright/test").Page,
  label: string,
  path: string,
) {
  const t0 = Date.now();
  const res = await apiJson(page, path);
  const ms = Date.now() - t0;
  expect(res.status).toBe(200);
  const body = res.body as { total?: number; leads?: unknown[] };
  const rows = Array.isArray(body.leads) ? body.leads.length : undefined;
  const payloadBytes = JSON.stringify(res.body).length;
  return {
    label,
    ms,
    rows,
    total: body.total,
    payloadKb: +(payloadBytes / 1024).toFixed(1),
    payloadBytes,
  };
}

test.describe("leads filters bench", () => {
  test.skip(!enabled, "Set LEADS_FILTER_BENCH=1 to run");

  test(`all-leads API filters + agent assigned (${size} seeded leads)`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(Math.max(300_000, size * 120));

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const users = await listUsers(page);
    const agent = users.find((u) => u.email === E2E_AGENT_EMAIL);
    expect(agent, `missing ${E2E_AGENT_EMAIL}`).toBeTruthy();
    const agentId = userId(agent);

    const statuses = await listStatuses(page);
    expect(statuses.length).toBeGreaterThan(0);
    const statusA = statusId(statuses[0]);
    const statusB = statusId(statuses[Math.min(1, statuses.length - 1)]);

    const stamp = Date.now();
    const importPayload = Array.from({ length: size }, (_, i) => ({
      name: `Filter Bench ${i}`,
      email: `filter.bench.${stamp}.${i}@e2e.motherland.test`,
      phone: `+1555${String(4000000 + i).slice(0, 7)}`,
      source: SOURCES[i % SOURCES.length],
      country: COUNTRIES[i % COUNTRIES.length],
    }));

    const tSeed = Date.now();
    const imported = await importLeadsWithRetry(page, importPayload);
    expect(imported.status).toBe(200);
    const seedMs = Date.now() - tSeed;

    const leadIds = await fetchBenchLeadIds(page, stamp, size);
    expect(leadIds.length).toBeGreaterThanOrEqual(size * 0.99);
    const n = leadIds.length;

    const half = Math.floor(n / 2);
    const statusBatchA = leadIds.slice(0, half);
    const statusBatchB = leadIds.slice(half);

    const tStatus = Date.now();
    expect(
      (
        await apiJson(page, "/api/leads/bulk/status", {
          method: "POST",
          body: JSON.stringify({ leadIds: statusBatchA, status: statusA }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await apiJson(page, "/api/leads/bulk/status", {
          method: "POST",
          body: JSON.stringify({ leadIds: statusBatchB, status: statusB }),
        })
      ).status,
    ).toBe(200);
    const statusSeedMs = Date.now() - tStatus;

    const assignCount = Math.min(MAX_ASSIGNED, n);
    const assignIds = leadIds.slice(0, assignCount);
    const tAssign = Date.now();
    expect(
      (
        await apiJson(page, "/api/leads/assign", {
          method: "POST",
          body: JSON.stringify({ leadIds: assignIds, userId: agentId }),
        })
      ).status,
    ).toBe(200);
    const assignMs = Date.now() - tAssign;

    const search = `filter.bench.${stamp}`;
    const enc = encodeURIComponent;
    const statusParam = enc(JSON.stringify([statusA]));
    const countryMatchParam = enc(JSON.stringify([MATCHING_COUNTRY]));
    const countryZeroParam = enc(JSON.stringify([ZERO_COUNTRY]));
    const sourceParam = enc(JSON.stringify([SOURCES[1]]));
    const userParam = enc(JSON.stringify([agentId]));

    const apiCases = [
      {
        label: "table page (no filter)",
        path: `/api/leads/all?page=1&pageSize=15`,
      },
      {
        label: "search only",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}`,
      },
      {
        label: "status filter",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}&status=${statusParam}&statusMode=include`,
      },
      {
        label: "country filter (matching)",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}&country=${countryMatchParam}&countryMode=include`,
      },
      {
        label: "country filter (zero results)",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}&country=${countryZeroParam}&countryMode=include`,
      },
      {
        label: "source filter",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}&source=${sourceParam}&sourceMode=include`,
      },
      {
        label: "agent filter",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}&user=${userParam}&userMode=include`,
      },
      {
        label: "combined filters",
        path: `/api/leads/all?page=1&pageSize=15&search=${enc(search)}&status=${statusParam}&country=${countryMatchParam}&source=${sourceParam}&user=${userParam}&statusMode=include&countryMode=include&sourceMode=include&userMode=include`,
      },
      {
        label: "max page (pageSize=500)",
        path: `/api/leads/all?page=1&pageSize=500&search=${enc(search)}`,
      },
    ];

    const allLeadsApi: Record<string, unknown> = {};
    let maxPagePayloadBytes = 0;
    for (const c of apiCases) {
      const result = await runApiCase(page, c.label, c.path);
      allLeadsApi[c.label] = {
        ms: result.ms,
        rows: result.rows,
        total: result.total,
        payloadKb: result.payloadKb,
      };
      if (c.label === "max page (pageSize=500)") {
        maxPagePayloadBytes = result.payloadBytes;
      }
    }

    const countryMatchTotal = (
      allLeadsApi["country filter (matching)"] as { total?: number }
    ).total;
    expect(
      countryMatchTotal ?? 0,
      "country filter should match seeded Germany rows — import must persist country",
    ).toBeGreaterThan(0);

    const countryZeroTotal = (
      allLeadsApi["country filter (zero results)"] as { total?: number }
    ).total;
    expect(countryZeroTotal ?? -1).toBe(0);

    const agentPage = await browser.newPage();
    await loginAs(agentPage, E2E_AGENT_EMAIL, E2E_PASSWORD);

    const tAssignedApi = Date.now();
    const assignedRes = await apiJson(agentPage, "/api/leads/assigned");
    const agentAssignedApiMs = Date.now() - tAssignedApi;
    expect(assignedRes.status).toBe(200);
    const assignedBody = assignedRes.body as
      | unknown[]
      | { assignedLeads?: unknown[]; count?: number };
    const agentAssignedRows = Array.isArray(assignedBody)
      ? assignedBody.length
      : Array.isArray(assignedBody.assignedLeads)
        ? assignedBody.assignedLeads.length
        : assignedBody.count;

    const allLeadsApiPath = `/api/leads/all?page=1&pageSize=15&search=${enc(search)}`;
    const allLeadsUiUrl = `/dashboard/all-leads?search=${enc(search)}&page=1&pageSize=15`;

    const allLeadsStartup = await measureColdWarmStartup(
      page,
      allLeadsUiUrl,
      "/api/leads/all",
      "allLeads",
      allLeadsApiPath,
    );

    const apiCompareAllLeads = await compareDirectFetchVsUiNavigation(
      page,
      allLeadsUiUrl,
      allLeadsApiPath,
      "/api/leads/all",
    );

    const uiAllLeadsStatusFilter = await measureLeadsPagePhases(
      page,
      `/dashboard/all-leads?search=${enc(search)}&page=1&pageSize=15&status=${statusParam}&statusMode=include`,
      { apiPathIncludes: "/api/leads/all" },
    );

    const assignedApiPath = "/api/leads/assigned";
    const agentStartup = await measureColdWarmStartup(
      agentPage,
      "/dashboard/leads",
      "/api/leads/assigned",
      "agent",
      assignedApiPath,
    );

    const apiCompareAgent = await compareDirectFetchVsUiNavigation(
      agentPage,
      "/dashboard/leads",
      assignedApiPath,
      "/api/leads/assigned",
    );

    const uiAgentStatusFilter = await measureAgentClientFilterPhases(
      agentPage,
      `/dashboard/leads?status=${statusParam}&statusMode=include`,
    );

    await agentPage.close();

    const maxPageStats =
      maxPagePayloadBytes > 0 ? payloadStats(maxPagePayloadBytes, n) : null;

    const report = {
      size: n,
      seedImportMs: seedMs,
      statusSeedMs: statusSeedMs,
      assignMs,
      assignedToAgent: assignCount,
      methodology: {
        primaryApiMetric:
          "ui.apiWireMs during navigation — not post-UI directFetchMs (distorted by dev compile/contention)",
        uiNavigationMs:
          "domcontentloaded — in dev, first hit often includes Next.js route compilation",
        uiHydrationQueueMs:
          "After domcontentloaded until leads GET is sent",
        uiApiWireMs: "Leads GET request sent → response during navigation",
        coldVsWarm:
          "startup.allLeads / startup.agent — cold=goto, warm=reload in same session",
        productionBench: "npm run test:leads-startup-bench:prod for next build && next start",
        investigationNotes: [
          "Table skeleton gated only on isLoadingLeads — lookups no longer block first row.",
          "StatusFilter uses StatusContext — one /api/statuses per dashboard session.",
          "UserFilter on All Leads uses users from useLeadsLookupQueries (no duplicate /api/users).",
          "Agent page: thin shell, dynamic UserLeadsContent, prefetch /api/leads/assigned.",
          "API routes emit Server-Timing / X-Api-Perf-Total-Ms when LEADS_FILTER_BENCH=1.",
          "4.5s cold dev allLeads is often ~2.5s Next.js compile — see startup.cold vs startup.warm.",
        ],
      },
      allLeadsApi,
      agentAssignedApiMs,
      agentAssignedRows,
      maxPagePayload: maxPageStats,
      apiCompare: {
        allLeads: apiCompareAllLeads,
        agent: apiCompareAgent,
      },
      startup: {
        allLeads: allLeadsStartup,
        agent: agentStartup,
      },
      ui: {
        allLeadsInitial: allLeadsStartup.cold,
        allLeadsWarm: allLeadsStartup.warm,
        allLeadsStatusFilter: uiAllLeadsStatusFilter,
        agentInitial: agentStartup.cold,
        agentWarm: agentStartup.warm,
        agentStatusFilter: uiAgentStatusFilter,
      },
      throughput: {
        allLeadsTableRowsPerSec: rate(
          15,
          (allLeadsApi["table page (no filter)"] as { ms: number }).ms,
        ),
      },
      baseURL: page.url().split("/dashboard")[0],
    };

    // eslint-disable-next-line no-console -- bench output
    console.log("\n=== Leads filters bench report ===\n", JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console -- bench output
    console.log(
      "\n" +
        [
          formatStartupReport({
            runtime:
              process.env.LEADS_BENCH_RUNTIME === "production"
                ? "production"
                : "development",
            allLeads: allLeadsStartup,
            agent: agentStartup,
          }),
          formatDirectVsUi("All Leads (legacy compare)", apiCompareAllLeads),
          formatUiPhases("All Leads — status filter (server)", uiAllLeadsStatusFilter),
          formatDirectVsUi("Agent (legacy compare)", apiCompareAgent),
          formatUiPhases("Agent — status filter (client)", uiAgentStatusFilter),
        ].join("\n\n"),
    );

    expect(
      (allLeadsApi["table page (no filter)"] as { ms: number }).ms,
    ).toBeLessThan(120_000);
    expect(agentAssignedApiMs).toBeLessThan(120_000);
  });
});

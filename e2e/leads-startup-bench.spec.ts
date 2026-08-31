/**
 * Startup benchmark: cold vs warm navigation, dev vs production.
 *
 * Reports DOMContentLoaded, hydration/queue, API wire, server timing, first row.
 * Does NOT treat post-UI direct fetch as the primary API metric.
 *
 * Dev (reuses existing :3000 when available):
 *   npm run test:leads-startup-bench:dev
 *   npm run test:leads-startup-bench:dev:fresh   # cold Next.js compile on :3001
 *
 * Production (build + next start on :3001):
 *   npm run test:leads-startup-bench:prod
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
  formatStartupReport,
  measureColdWarmStartup,
  type BenchRuntime,
} from "./helpers/leadsBench";
import {
  importLeadsWithRetry,
  listUsers,
  userId,
} from "./helpers/assignmentUi";

const enabled = process.env.LEADS_BENCH_STARTUP === "1";
const size = Math.min(
  200,
  Math.max(25, Number(process.env.LEADS_FILTER_BENCH_SIZE || 100)),
);

function runtimeLabel(): BenchRuntime {
  return process.env.LEADS_BENCH_RUNTIME === "production"
    ? "production"
    : "development";
}

async function fetchLeadIdsForSearch(
  page: import("@playwright/test").Page,
  search: string,
  expected: number,
) {
  const pageSize = Math.min(500, Math.max(50, expected));
  const res = await apiJson(
    page,
    `/api/leads/all?search=${encodeURIComponent(search)}&page=1&pageSize=${pageSize}`,
  );
  expect(res.status).toBe(200);
  const leads = (res.body as { leads?: { _id: string }[] }).leads ?? [];
  return leads.map((l) => l._id).filter(Boolean);
}

test.describe("leads startup bench", () => {
  test.skip(!enabled, "Set LEADS_BENCH_STARTUP=1 to run");

  test(`cold + warm startup (${size} leads, ${runtimeLabel()})`, async ({
    browser,
  }) => {
    test.setTimeout(Math.max(300_000, size * 90));

    const runtime = runtimeLabel();
    const stamp = Date.now();
    const search = `startup.bench.${stamp}`;
    const enc = encodeURIComponent;

    // Seed via API only — does not compile /dashboard/* page chunks.
    const seedPage = await browser.newPage();
    await loginAs(seedPage, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const users = await listUsers(seedPage);
    const agent = users.find((u) => u.email === E2E_AGENT_EMAIL);
    expect(agent, `missing ${E2E_AGENT_EMAIL}`).toBeTruthy();
    const agentId = userId(agent);

    const importPayload = Array.from({ length: size }, (_, i) => ({
      name: `Startup Bench ${i}`,
      email: `startup.bench.${stamp}.${i}@e2e.motherland.test`,
      phone: `+1555${String(5000000 + i).slice(0, 7)}`,
      source: "startup-bench",
      country: "Germany",
    }));

    const imported = await importLeadsWithRetry(seedPage, importPayload);
    expect(imported.status).toBe(200);

    const leadIds = await fetchLeadIdsForSearch(seedPage, search, size);
    expect(leadIds.length).toBeGreaterThanOrEqual(Math.floor(size * 0.99));

    expect(
      (
        await apiJson(seedPage, "/api/leads/assign", {
          method: "POST",
          body: JSON.stringify({
            leadIds: leadIds.slice(0, size),
            userId: agentId,
          }),
        })
      ).status,
    ).toBe(200);
    await seedPage.close();

    const allLeadsUrl = `/dashboard/all-leads?search=${enc(search)}&page=1&pageSize=15`;
    const allLeadsApi = `/api/leads/all?page=1&pageSize=15&search=${enc(search)}`;

    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginAs(adminPage, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const allLeads = await measureColdWarmStartup(
      adminPage,
      allLeadsUrl,
      "/api/leads/all",
      "allLeads",
      allLeadsApi,
    );
    await adminCtx.close();

    const agentCtx = await browser.newContext();
    const agentPage = await agentCtx.newPage();
    await loginAs(agentPage, E2E_AGENT_EMAIL, E2E_PASSWORD);
    const agentStartup = await measureColdWarmStartup(
      agentPage,
      "/dashboard/leads",
      "/api/leads/assigned",
      "agent",
      "/api/leads/assigned",
    );
    await agentCtx.close();

    const devCompileNote =
      runtime === "development"
        ? "Dev cold navigation often includes Next.js route compilation (see server logs). Compare warm + production."
        : "Production build — cold/warm here reflect real user latency without dev compilation.";

    const report = {
      runtime,
      freshServer: process.env.PLAYWRIGHT_FRESH_SERVER === "1",
      size,
      search,
      allLeads,
      agent: agentStartup,
      methodology: {
        primaryApiMetric:
          "apiWireMs — leads GET request sent → response during navigation",
        serverApiMetric:
          "serverTimingMs — X-Api-Perf-Total-Ms response header",
        isolatedApiMetric:
          "isolatedApiWireMs — fetch after UI settle (secondary)",
        cold: "First goto in a fresh browser context after API-only seeding",
        warm: "page.reload() of the same URL in the same session",
        devVsProd:
          "Run test:leads-startup-bench:dev and test:leads-startup-bench:prod",
      },
      note: devCompileNote,
    };

    // eslint-disable-next-line no-console -- bench output
    console.log(
      "\n=== Leads startup bench report ===\n",
      JSON.stringify(report, null, 2),
    );
    // eslint-disable-next-line no-console -- bench output
    console.log(
      "\n" +
        formatStartupReport({
          runtime,
          allLeads,
          agent: agentStartup,
          note: devCompileNote,
        }),
    );

    for (const pair of [allLeads, agentStartup]) {
      for (const phase of [pair.cold, pair.warm]) {
        expect(phase.firstTableRowMs).toBeLessThan(120_000);
        if (phase.apiWireMs != null) {
          expect(phase.apiWireMs).toBeLessThan(120_000);
        }
      }
    }
  });
});

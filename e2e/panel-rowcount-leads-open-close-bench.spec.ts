/**
 * Agent /dashboard/leads panel open/close across page sizes (virtualized table).
 *
 *   PANEL_ROWCOUNT_LEADS_BENCH=1 playwright test e2e/panel-rowcount-leads-open-close-bench.spec.ts
 *
 * Prod:
 *   PANEL_ROWCOUNT_LEADS_BENCH=1 PLAYWRIGHT_NO_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
 *     playwright test e2e/panel-rowcount-leads-open-close-bench.spec.ts
 *
 * Optional:
 *   PANEL_ROWCOUNT_SIZES=20,60,100,250,300,400,500
 *   PANEL_BENCH_ROUNDS=3
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E_AGENT_EMAIL, E2E_PASSWORD, loginAs } from "./helpers/auth";
import { leadsDataTable } from "./helpers/assignmentUi";
import {
  closeLeadDetailPanel,
  leadDetailsPanel,
} from "./helpers/leadDetailPanelUi";

const enabled = process.env.PANEL_ROWCOUNT_LEADS_BENCH === "1";
const metaPath = path.join(process.cwd(), "e2e", ".panel-rowcount-bench.json");
const rounds = Math.max(
  1,
  Math.min(4, Number(process.env.PANEL_BENCH_ROUNDS || 3)),
);

/** My Leads Show sizes used for open/close benches (even steps of 20). */
const DEFAULT_SIZES = [20, 60, 100, 250, 300, 400, 500];

function parseSizes(): number[] {
  const raw = process.env.PANEL_ROWCOUNT_SIZES?.trim();
  if (!raw) return DEFAULT_SIZES;
  const parsed = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length ? parsed : DEFAULT_SIZES;
}

type Sample = {
  pageSize: number;
  round: number;
  warmth: "cold" | "warm";
  clickToShellMs: number;
  closeMs: number;
  rowCountDom: number;
};

function report(label: string, data: unknown) {
  console.log(
    JSON.stringify({
      flow: "panel-rowcount-leads-open-close-bench",
      label,
      data,
    }, null, 2),
  );
}

function avg(xs: number[]) {
  return xs.length
    ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
    : null;
}

async function gotoMyLeads(page: Page, source: string, pageSize: number) {
  const qs = new URLSearchParams({
    source: JSON.stringify([source]),
    sourceMode: "include",
    pageSize: String(pageSize),
    page: "1",
    sortField: "lastActivityAt",
    sortOrder: "desc",
  });
  await page.goto(`/dashboard/leads?${qs.toString()}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: /my leads/i })).toBeVisible({
    timeout: 60_000,
  });
  const table = leadsDataTable(page);
  await expect(
    table.locator("tbody tr").filter({ hasText: /rowcount target/i }).first(),
  ).toBeVisible({ timeout: 120_000 });
  await expect
    .poll(async () => table.locator("tbody tr[data-lead-id]").count(), {
      timeout: 60_000,
    })
    .toBeGreaterThanOrEqual(Math.min(pageSize, 8));
}

async function measure(
  page: Page,
  pageSize: number,
  round: number,
  warmth: "cold" | "warm",
): Promise<Sample> {
  await closeLeadDetailPanel(page).catch(() => {});

  const table = leadsDataTable(page);
  const rowCountDom = await table.locator("tbody tr[data-lead-id]").count();
  const row = table
    .locator("tbody tr")
    .filter({ hasText: /rowcount target/i })
    .first();
  await expect(row).toBeVisible();

  const panel = leadDetailsPanel(page);
  const t0 = Date.now();
  await row.click();
  await expect(panel.getByLabel("Close panel")).toBeVisible({ timeout: 30_000 });
  const clickToShellMs = Date.now() - t0;
  const closeMs = await closeLeadDetailPanel(page);

  return {
    pageSize,
    round,
    warmth,
    clickToShellMs,
    closeMs,
    rowCountDom,
  };
}

async function runSize(
  page: Page,
  source: string,
  pageSize: number,
): Promise<Sample[]> {
  await gotoMyLeads(page, source, pageSize);
  const samples: Sample[] = [];
  samples.push(await measure(page, pageSize, 1, "cold"));
  for (let i = 2; i <= rounds; i++) {
    samples.push(await measure(page, pageSize, i, "warm"));
  }
  return samples;
}

function summarizeSize(samples: Sample[]) {
  const warm = samples.filter((s) => s.warmth === "warm");
  return {
    pageSize: samples[0]?.pageSize ?? null,
    domRows: samples.map((s) => s.rowCountDom),
    openAvg: avg(samples.map((s) => s.clickToShellMs)),
    openWarmAvg: avg(warm.map((s) => s.clickToShellMs)),
    closeAvg: avg(samples.map((s) => s.closeMs)),
    closeWarmAvg: avg(warm.map((s) => s.closeMs)),
    openSamples: samples.map((s) => s.clickToShellMs),
    closeSamples: samples.map((s) => s.closeMs),
  };
}

test.describe("agent /leads panel open/close vs page size", () => {
  test.skip(!enabled, "Set PANEL_ROWCOUNT_LEADS_BENCH=1 to run");

  test("open/close across my-leads page sizes", async ({ page }) => {
    const sizes = parseSizes();
    test.setTimeout(Math.max(600_000, sizes.length * 120_000));

    if (!process.env.MONGODB_URI) {
      test.skip(true, "MONGODB_URI required");
    }

    execFileSync(
      "node",
      ["--env-file=.env", "scripts/e2e-seed-panel-rowcount-bench.mjs"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: {
          ...process.env,
          PANEL_ROWCOUNT_FILLER: process.env.PANEL_ROWCOUNT_FILLER || "499",
          PANEL_ROWCOUNT_ASSIGN_AGENT: "1",
        },
      },
    );

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
      source: string;
      totalLeads: number;
      assignedToAgent?: boolean;
    };
    expect(meta.assignedToAgent).toBe(true);
    expect(meta.totalLeads).toBeGreaterThanOrEqual(Math.max(...sizes));

    // UI login: API captcha cookie can flake on prod `next start` for agent.
    await loginAs(page, E2E_AGENT_EMAIL, E2E_PASSWORD);

    const bySize: Record<string, Sample[]> = {};
    for (const size of sizes) {
      bySize[String(size)] = await runSize(page, meta.source, size);
      report(`samples-${size}`, bySize[String(size)]);
    }

    const summary = Object.fromEntries(
      sizes.map((size) => [String(size), summarizeSize(bySize[String(size)])]),
    );

    report("meta", meta);
    report("summary", summary);
    report(
      "table",
      sizes.map((size) => {
        const s = summary[String(size)];
        return {
          pageSize: size,
          domRows: s.domRows?.[0] ?? null,
          openWarmAvgMs: s.openWarmAvg,
          closeWarmAvgMs: s.closeWarmAvg,
          openAvgMs: s.openAvg,
          closeAvgMs: s.closeAvg,
        };
      }),
    );
  });
});

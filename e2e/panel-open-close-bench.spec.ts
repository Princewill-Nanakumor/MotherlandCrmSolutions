/**
 * Focused lead-panel open/close timings (shell + timeline first paint + close).
 *
 * Local production build:
 *   Terminal 1: API_PERF_TIMING=1 npm run build && API_PERF_TIMING=1 npm run start -- -p 3001
 *   Terminal 2: PANEL_OPEN_CLOSE_BENCH=1 PLAYWRIGHT_NO_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 \
 *     playwright test e2e/panel-open-close-bench.spec.ts
 *
 * Live production (needs valid credentials for that host):
 *   PANEL_OPEN_CLOSE_BENCH=1 PLAYWRIGHT_NO_WEBSERVER=1 \
 *     PLAYWRIGHT_BASE_URL=https://motherlandcrmsolutions.com \
 *     playwright test e2e/panel-open-close-bench.spec.ts
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page, type Response } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_PASSWORD, loginAsFast } from "./helpers/auth";
import {
  closeLeadDetailPanel,
  leadDetailsPanel,
  searchLeadInTable,
} from "./helpers/leadDetailPanelUi";
import { gotoAllLeadsForBench } from "./helpers/leadDetailPanelUi";

const enabled = process.env.PANEL_OPEN_CLOSE_BENCH === "1";
const metaPath = path.join(process.cwd(), "e2e", ".lead-detail-bench.json");
const rounds = Math.max(1, Math.min(5, Number(process.env.PANEL_BENCH_ROUNDS || 3)));

type Sample = {
  round: number;
  warmth: "cold" | "warm";
  clickToShellMs: number;
  commentsReadyMs: number | null;
  activitiesReadyMs: number | null;
  closeMs: number;
  apis: Array<{
    path: string;
    status: number;
    clientMs: number | null;
    handlerMs: number | null;
  }>;
};

function report(label: string, data: unknown) {
  console.log(
    JSON.stringify({ flow: "panel-open-close-bench", label, data }, null, 2),
  );
}

function apiKind(url: string, leadId: string): string | null {
  try {
    const u = new URL(url);
    const p = u.pathname;
    if (p === `/api/leads/${leadId}`) return "lead";
    if (p === `/api/leads/${leadId}/comments`) return "comments";
    if (p === `/api/leads/${leadId}/activities`) return "activities";
    if (p === `/api/leads/${leadId}/reminders`) return "reminders";
    return null;
  } catch {
    return null;
  }
}

async function measureOpenClose(
  page: Page,
  email: string,
  leadId: string,
  round: number,
  warmth: "cold" | "warm",
): Promise<Sample> {
  const panel = leadDetailsPanel(page);
  await closeLeadDetailPanel(page).catch(() => {});

  const apis: Sample["apis"] = [];
  const onResponse = (res: Response) => {
    const kind = apiKind(res.url(), leadId);
    if (!kind || res.request().method() !== "GET") return;
    const timing = res.request().timing();
    const clientMs =
      timing.responseEnd > 0
        ? Math.round(timing.responseEnd - timing.startTime)
        : null;
    const handlerRaw = res.headers()["x-api-perf-total-ms"];
    apis.push({
      path: kind,
      status: res.status(),
      clientMs,
      handlerMs: handlerRaw ? Number(handlerRaw) : null,
    });
  };
  page.on("response", onResponse);

  const row = await searchLeadInTable(page, email, { debounceMs: 350 });
  const t0 = Date.now();
  await row.click();
  await expect(panel.getByLabel("Close panel")).toBeVisible({ timeout: 30_000 });
  const clickToShellMs = Date.now() - t0;

  let commentsReadyMs: number | null = null;
  let activitiesReadyMs: number | null = null;
  try {
    await expect
      .poll(
        async () =>
          panel.locator("p", { hasText: /^e2e\.bench\.comment\.\d+/ }).count(),
        { timeout: 45_000 },
      )
      .toBeGreaterThan(0);
    commentsReadyMs = Date.now() - t0;
  } catch {
    commentsReadyMs = null;
  }

  // Activities may stream in after comments (progressive timeline).
  try {
    await expect
      .poll(async () => panel.getByText(/changed status/i).count(), {
        timeout: 45_000,
      })
      .toBeGreaterThan(0);
    activitiesReadyMs = Date.now() - t0;
  } catch {
    activitiesReadyMs = null;
  }

  const closeMs = await closeLeadDetailPanel(page);
  page.off("response", onResponse);

  return {
    round,
    warmth,
    clickToShellMs,
    commentsReadyMs,
    activitiesReadyMs,
    closeMs,
    apis,
  };
}

function summarize(samples: Sample[]) {
  const nums = (pick: (s: Sample) => number | null) =>
    samples
      .map(pick)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  const p95 = (xs: number[]) => {
    if (!xs.length) return null;
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  };

  const shell = nums((s) => s.clickToShellMs);
  const comments = nums((s) => s.commentsReadyMs);
  const activities = nums((s) => s.activitiesReadyMs);
  const close = nums((s) => s.closeMs);

  return {
    rounds: samples.length,
    shellMs: { avg: avg(shell), p95: p95(shell), samples: shell },
    commentsReadyMs: {
      avg: avg(comments),
      p95: p95(comments),
      samples: comments,
    },
    activitiesReadyMs: {
      avg: avg(activities),
      p95: p95(activities),
      samples: activities,
    },
    closeMs: { avg: avg(close), p95: p95(close), samples: close },
  };
}

test.describe("panel open/close bench", () => {
  test.skip(!enabled, "Set PANEL_OPEN_CLOSE_BENCH=1 to run");

  test("measure open shell, timeline, and close", async ({ page }) => {
    test.setTimeout(600_000);

    if (!process.env.MONGODB_URI) {
      test.skip(true, "MONGODB_URI required to seed bench lead");
    }

    execFileSync(
      "node",
      ["--env-file=.env", "scripts/e2e-seed-lead-detail-bench.mjs"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: {
          ...process.env,
          LEAD_DETAIL_BENCH_COMMENTS: process.env.LEAD_DETAIL_BENCH_COMMENTS || "8",
          LEAD_DETAIL_BENCH_ACTIVITIES:
            process.env.LEAD_DETAIL_BENCH_ACTIVITIES || "20",
          LEAD_DETAIL_BENCH_REMINDERS: "0",
        },
      },
    );

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
      email: string;
      leadId: string;
    };

    await loginAsFast(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await gotoAllLeadsForBench(page);

    const samples: Sample[] = [];
    samples.push(
      await measureOpenClose(page, meta.email, meta.leadId, 1, "cold"),
    );
    for (let i = 2; i <= rounds; i++) {
      samples.push(
        await measureOpenClose(page, meta.email, meta.leadId, i, "warm"),
      );
    }

    const warm = samples.filter((s) => s.warmth === "warm");
    report("baseURL", process.env.PLAYWRIGHT_BASE_URL || "default");
    report("samples", samples);
    report("summary-all", summarize(samples));
    if (warm.length) report("summary-warm", summarize(warm));

    expect(samples[0].clickToShellMs).toBeLessThan(15_000);
    expect(samples[0].closeMs).toBeLessThan(10_000);
  });
});

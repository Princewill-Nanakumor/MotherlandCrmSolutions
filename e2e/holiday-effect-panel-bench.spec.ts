/**
 * Holiday overlay vs panel open/close — all-leads + /leads.
 *
 *   HOLIDAY_PANEL_BENCH=1 playwright test e2e/holiday-effect-panel-bench.spec.ts
 *
 * Modes via URL:
 *   holidayEffects=0              → effect off
 *   holidayPreview=christmas      → forced high-intensity CSS snow
 *   holidayPreview=valentine      → framer-motion cupids (JS main-thread)
 *   holidayPreview=thanksgiving   → next calendar window (low/medium CSS)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  loginAsFast,
} from "./helpers/auth";
import {
  closeLeadDetailPanel,
  leadDetailsPanel,
  searchLeadInTable,
} from "./helpers/leadDetailPanelUi";
import { leadsDataTable } from "./helpers/assignmentUi";

const enabled = process.env.HOLIDAY_PANEL_BENCH === "1";
const metaPath = "e2e/.lead-detail-bench.json";

type HolidayMode = "off" | "christmas" | "valentine" | "thanksgiving";

type IdleSample = {
  longTaskCount: number;
  longTaskTotalMs: number;
  longTaskMaxMs: number;
  animatedCount: number;
  holidayMounted: boolean;
};

type OpenCloseSample = {
  page: string;
  mode: HolidayMode;
  clickToPanelMs: number;
  closeToGoneMs: number;
  idle: IdleSample;
  leadFetchMs: number | null;
};

function holidayQuery(mode: HolidayMode): string {
  if (mode === "off") return "holidayEffects=0";
  return `holidayPreview=${mode}`;
}

async function sampleIdle(page: Page, settleMs = 2500): Promise<IdleSample> {
  return page.evaluate(async (ms) => {
    const tasks: number[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        tasks.push(entry.duration);
      }
    });
    try {
      observer.observe({ type: "longtask", buffered: false } as PerformanceObserverInit);
    } catch {
      // Safari / some engines lack longtask
    }

    await new Promise((r) => setTimeout(r, ms));
    observer.disconnect();

    const holidayRoot = document.querySelector(
      "[data-testid^=holiday-effect-]",
    );
    const animated = document.querySelectorAll(
      ".holiday-emoji-fall, .holiday-emoji-fly, .holiday-snow-dot, .holiday-name-fall, .holiday-spider, [data-holiday-effect]",
    ).length;

    return {
      longTaskCount: tasks.length,
      longTaskTotalMs: Math.round(tasks.reduce((a, b) => a + b, 0)),
      longTaskMaxMs: tasks.length ? Math.round(Math.max(...tasks)) : 0,
      animatedCount: animated,
      holidayMounted: !!holidayRoot,
    };
  }, settleMs);
}

async function openSeededLeadAndMeasure(
  page: Page,
  email: string,
): Promise<{
  clickToPanelMs: number;
  leadFetchMs: number | null;
}> {
  const row = await searchLeadInTable(page, email);

  let leadFetchMs: number | null = null;
  const onResponse = (res: import("@playwright/test").Response) => {
    const url = res.url();
    if (
      res.request().method() === "GET" &&
      /\/api\/leads\/[a-f0-9]{24}(?:\?|$)/i.test(url) &&
      !url.includes("/comments") &&
      !url.includes("/activities") &&
      !url.includes("/reminders")
    ) {
      const timing = res.request().timing();
      if (timing.responseEnd > 0) {
        leadFetchMs = Math.round(timing.responseEnd - timing.startTime);
      }
    }
  };
  page.on("response", onResponse);

  const t0 = Date.now();
  await row.click();
  const panel = leadDetailsPanel(page);
  await expect(panel.getByLabel("Close panel")).toBeVisible({ timeout: 30_000 });
  const clickToPanelMs = Date.now() - t0;

  page.off("response", onResponse);
  return { clickToPanelMs, leadFetchMs };
}

async function measureClose(page: Page): Promise<number> {
  const t0 = Date.now();
  await closeLeadDetailPanel(page);
  await expect(page.getByLabel("Close panel")).toBeHidden({ timeout: 15_000 });
  return Date.now() - t0;
}

async function runScenario(
  page: Page,
  route: "/dashboard/all-leads" | "/dashboard/leads",
  mode: HolidayMode,
  email: string,
): Promise<OpenCloseSample> {
  const qs = holidayQuery(mode);
  await page.goto(`${route}?${qs}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  if (route === "/dashboard/all-leads") {
    await expect(
      page.getByRole("heading", { name: /leads management/i }),
    ).toBeVisible({ timeout: 60_000 });
  } else {
    await expect(page).toHaveURL(/\/dashboard\/leads/, { timeout: 30_000 });
    await expect(leadsDataTable(page)).toBeVisible({ timeout: 60_000 });
  }

  // Let holiday chunk + first paint settle before sampling.
  await page.waitForTimeout(800);
  const idle = await sampleIdle(page, 2500);

  const open = await openSeededLeadAndMeasure(page, email);
  // Brief hold so pause class applies while panel is open.
  await page.waitForTimeout(400);
  const closeToGoneMs = await measureClose(page);

  return {
    page: route,
    mode,
    clickToPanelMs: open.clickToPanelMs,
    closeToGoneMs,
    idle,
    leadFetchMs: open.leadFetchMs,
  };
}

function report(samples: OpenCloseSample[]) {
  console.log(
    JSON.stringify({ flow: "holiday-effect-panel-bench", samples }, null, 2),
  );
}

test.describe("holiday effect panel bench", () => {
  test.skip(!enabled, "Set HOLIDAY_PANEL_BENCH=1 to run");

  test("all-leads + /leads: off vs christmas vs valentine vs thanksgiving", async ({
    page,
  }) => {
    test.setTimeout(600_000);

    if (!process.env.MONGODB_URI) {
      test.skip(true, "MONGODB_URI required to seed a lead for the bench");
    }
    // Lightweight seed: one assigned lead with minimal timeline noise.
    execFileSync(
      "node",
      ["--env-file=.env", "scripts/e2e-seed-lead-detail-bench.mjs"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: {
          ...process.env,
          LEAD_DETAIL_BENCH_COMMENTS: "2",
          LEAD_DETAIL_BENCH_ACTIVITIES: "2",
          LEAD_DETAIL_BENCH_REMINDERS: "0",
        },
      },
    );
    execFileSync(
      "node",
      ["--env-file=.env", "scripts/e2e-assign-bench-lead-to-agent.mjs"],
      { cwd: process.cwd(), stdio: "inherit" },
    );

    await loginAsFast(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as {
      email: string;
      leadId: string;
    };

    const modes: HolidayMode[] = [
      "off",
      "christmas",
      "thanksgiving",
      "valentine",
    ];
    const samples: OpenCloseSample[] = [];

    for (const mode of modes) {
      samples.push(
        await runScenario(page, "/dashboard/all-leads", mode, meta.email),
      );
    }
    report(samples.filter((s) => s.page === "/dashboard/all-leads"));

    // Agent page — same overlay (dashboard layout), different table.
    await loginAsFast(page, E2E_AGENT_EMAIL, E2E_PASSWORD);
    await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/dashboard\/leads/, { timeout: 30_000 });

    for (const mode of modes) {
      samples.push(
        await runScenario(page, "/dashboard/leads", mode, meta.email),
      );
    }

    report(samples);

    const allLeadsOff = samples.find(
      (s) => s.page === "/dashboard/all-leads" && s.mode === "off",
    );
    const allLeadsXmas = samples.find(
      (s) => s.page === "/dashboard/all-leads" && s.mode === "christmas",
    );
    expect(allLeadsOff?.idle.holidayMounted).toBe(false);
    expect(allLeadsXmas?.idle.holidayMounted).toBe(true);
    expect(allLeadsXmas?.idle.animatedCount ?? 0).toBeGreaterThan(0);
  });
});

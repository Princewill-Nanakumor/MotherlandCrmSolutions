/**
 * Lead detail panel — open/load/interaction benchmark.
 *
 * Seeds a lead with 100 comments + 100 status activities + reminders (configurable),
 * opens the slide-over from All Leads, measures API waterfall + UX timings,
 * exercises comments/reminders CRUD, and reports JSON.
 *
 *   npm run test:lead-detail-panel-bench
 *   LEAD_DETAIL_PANEL_BENCH=1 LEAD_DETAIL_BENCH_COMMENTS=200 playwright test e2e/lead-detail-panel-bench.spec.ts
 *
 * Production server (no next dev — compares cold queue vs dev compilation):
 *   Terminal 1: npm run build && npm run start   # wait for "Ready"
 *   Terminal 2: LEAD_DETAIL_PANEL_BENCH=1 LEAD_DETAIL_BENCH_COMMENTS=150 ... npm run test:lead-detail-panel-bench:prod
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_PASSWORD, loginAs } from "./helpers/auth";
import {
  addCommentInPanel,
  closeLeadDetailPanel,
  deleteCommentInPanel,
  deleteReminderInPanel,
  formatApiWaterfall,
  gotoAllLeadsForBench,
  leadDetailsPanel,
  openLeadDetailPanelAndMeasure,
  summarizeQueueContention,
  switchToCommentsTab,
  switchToRemindersTab,
  type LeadDetailOpenTimings,
} from "./helpers/leadDetailPanelUi";

const enabled = process.env.LEAD_DETAIL_PANEL_BENCH === "1";
const metaPath = path.join(process.cwd(), "e2e", ".lead-detail-bench.json");

type BenchMeta = {
  leadId: string;
  email: string;
  stamp: number;
  counts: {
    comments: number;
    activities: number;
    reminders: number;
    timelineExpected: number;
  };
};

function report(label: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ flow: "lead-detail-panel-bench", warmth: label, ...data }, null, 2));
}

function summarizeOpen(label: string, open: LeadDetailOpenTimings, meta: BenchMeta) {
  const timelineApis = open.apiWaterfall.filter((c) =>
    /\/comments$|\/activities$|\/reminders$/.test(c.path),
  );
  const queueSamples = timelineApis
    .map((c) => c.queueToHandlerMs)
    .filter((ms): ms is number => ms != null);
  const handlerSamples = timelineApis
    .map((c) => c.handlerTotalMs)
    .filter((ms): ms is number => ms != null && Number.isFinite(ms));

  report(label, {
    panelVisibleMs: open.panelVisibleMs,
    leadFetchMs: open.leadFetchMs,
    leadFetch: open.leadFetch,
    commentsFetchMs: open.commentsFetchMs,
    activitiesFetchMs: open.activitiesFetchMs,
    remindersFetchMs: open.remindersFetchMs,
    statusesFetchMs: open.statusesFetchMs,
    timelineReadyMs: open.timelineReadyMs,
    timelineDomCountMs: open.timelineDomCountMs,
    timelineItemCount: open.timelineItemCount,
    commentItemCount: open.commentItemCount,
    activityItemCount: open.activityItemCount,
    timelineExpected: meta.counts.timelineExpected,
    coldQueueToHandlerMsMedian:
      queueSamples.length > 0
        ? Math.round(
            queueSamples.sort((a, b) => a - b)[Math.floor(queueSamples.length / 2)],
          )
        : null,
    coldHandlerTotalMsMedian:
      handlerSamples.length > 0
        ? Math.round(
            handlerSamples.sort((a, b) => a - b)[
              Math.floor(handlerSamples.length / 2)
            ],
          )
        : null,
    queueByInFlightAtEntry: summarizeQueueContention(open.apiWaterfall),
    apiWaterfall: open.apiWaterfall.map((c) => ({
      path: c.path,
      ms: c.durationMs,
      resourceTimingMs: c.resourceTimingMs,
      reportedMs:
        c.durationMs > 0
          ? c.durationMs
          : c.resourceTimingMs ?? c.handlerTotalMs ?? c.durationMs,
      startedMs: c.requestStartedMs,
      status: c.status,
      queueToHandlerMs: c.queueToHandlerMs,
      handlerTotalMs: c.handlerTotalMs,
      inFlightAtEntry: c.inFlightAtEntry,
    })),
  });
  console.log(`\n--- ${label} API waterfall ---\n${formatApiWaterfall(open.apiWaterfall)}\n`);
}

test.describe("lead detail panel bench", () => {
  test.skip(!enabled, "Set LEAD_DETAIL_PANEL_BENCH=1 to run");

  test("open, load timeline, reminders, CRUD, and close", async ({ page }) => {
    test.setTimeout(600_000);

    if (!process.env.MONGODB_URI) {
      test.skip(true, "MONGODB_URI required for bench seed");
    }

    execFileSync(
      "node",
      ["--env-file=.env", "scripts/e2e-seed-lead-detail-bench.mjs"],
      { cwd: process.cwd(), stdio: "inherit" },
    );
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as BenchMeta;
    expect(meta.leadId).toBeTruthy();
    expect(meta.email).toBeTruthy();

    const stamp = Date.now();
    const newComment = `E2E panel comment ${stamp}`;
    const deleteCommentTarget = "e2e.bench.comment.0 — detail panel timeline seed";
    const deleteReminderTarget = "e2e.bench.reminder.0";

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await gotoAllLeadsForBench(page);

    const cold = await openLeadDetailPanelAndMeasure(page, meta.email, meta.leadId, {
      minTimelineItems: Math.min(20, meta.counts.comments),
    });
    summarizeOpen("cold", cold, meta);

    expect(cold.panelVisibleMs).toBeLessThan(60_000);
    expect(cold.timelineItemCount).toBeGreaterThanOrEqual(
      Math.min(20, meta.counts.comments),
    );

    const panel = leadDetailsPanel(page);
    const remindersTabMs = await switchToRemindersTab(page);
    await expect(
      panel.getByRole("heading", { name: deleteReminderTarget, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    report("reminders-tab", { remindersTabMs });

    await switchToCommentsTab(page);

    const { addCommentMs, commentVisibleMs } = await addCommentInPanel(
      page,
      newComment,
    );
    report("add-comment", { addCommentMs, commentVisibleMs });

    const deleteCommentResult = await deleteCommentInPanel(page, deleteCommentTarget);
    report("delete-comment", deleteCommentResult);

    await switchToRemindersTab(page);
    const deleteReminderResult = await deleteReminderInPanel(
      page,
      deleteReminderTarget,
    );
    report("delete-reminder", deleteReminderResult);

    const closePanelMs = await closeLeadDetailPanel(page);
    report("close-panel", { closePanelMs });

    const warm = await openLeadDetailPanelAndMeasure(page, meta.email, meta.leadId, {
      timelineMarker: newComment,
      minTimelineItems: 1,
      waitForApis: false,
    });
    summarizeOpen("warm", warm, meta);

    expect(warm.panelVisibleMs).toBeLessThan(15_000);

    await closeLeadDetailPanel(page);
  });
});

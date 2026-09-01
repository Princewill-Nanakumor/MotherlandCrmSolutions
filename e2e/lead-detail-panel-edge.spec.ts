/**
 * Lead detail panel — edge cases not covered by the perf bench.
 *
 *   npm run test:lead-detail-panel-edge
 *
 * Intended contracts (documented in JSON reports):
 * - navigate-during-status-change: browser may abort the PATCH (patchObservedByClient
 *   false); server may still apply if the handler ran before abort. UI and GET must agree.
 * - navigate-during-add-status: in-flight POST is aborted on navigation — status
 *   must NOT exist (no fetch keepalive). close-during-add-status: POST completes
 *   before panel close — status must exist.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { listStatuses, statusId, type StatusRow } from "./helpers/assignmentUi";
import { apiJson, E2E_ADMIN_EMAIL, E2E_PASSWORD, loginAsFast } from "./helpers/auth";
import {
  fetchCallLogsForLead,
  fetchCommentCount,
  fetchSessionUserId,
} from "./helpers/leadDetailEdgeApi";
import {
  clickCallButtonInPanel,
  closeLeadDetailPanel,
  closeLeadDetailPanelIfOpen,
  delayApiRoute,
  dismissDialogIfOpen,
  expectContactPhoneVisible,
  fillAddStatusForm,
  gotoAllLeadsForBench,
  INTERRUPT_DELAY_MS,
  leadDetailsPanel,
  navigateAwayFromPanel,
  openAddStatusModal,
  openLeadDetailPanelOnly,
  readCommentDraftLocal,
  removeApiRouteDelay,
  searchLeadInTable,
  selectLeadStatusInPanel,
  showCommentTextareaInPanel,
  submitAddStatusForm,
} from "./helpers/leadDetailPanelUi";

const enabled =
  process.env.LEAD_DETAIL_PANEL_EDGE === "1" ||
  process.env.LEAD_DETAIL_PANEL_BENCH === "1";
const metaPath = path.join(process.cwd(), "e2e", ".lead-detail-bench.json");
const FAST_SEARCH = { searchDebounceMs: 0 } as const;

type BenchMeta = { leadId: string; email: string; stamp: number };

function report(scenario: string, data: Record<string, unknown>) {
  console.log(
    JSON.stringify({ flow: "lead-detail-panel-edge", scenario, ...data }, null, 2),
  );
}

function seedMinimalLead() {
  execFileSync(
    "node",
    ["--env-file=.env", "scripts/e2e-seed-lead-detail-bench.mjs"],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        LEAD_DETAIL_BENCH_COMMENTS: "0",
        LEAD_DETAIL_BENCH_ACTIVITIES: "0",
        LEAD_DETAIL_BENCH_REMINDERS: "0",
      },
    },
  );
  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as BenchMeta;
}

function resolveStatusName(statuses: StatusRow[], raw: string): string {
  const row = statuses.find(
    (s) => statusId(s) === raw || s.name === raw || s.name.toLowerCase() === raw.toLowerCase(),
  );
  return row?.name ?? raw;
}

async function fetchLeadStatusRaw(page: import("@playwright/test").Page, leadId: string) {
  const res = await apiJson(page, `/api/leads/${leadId}`);
  expect(res.status).toBe(200);
  return String((res.body as { status?: string }).status ?? "");
}

test.describe("lead detail panel edge cases", () => {
  test.skip(!enabled, "Set LEAD_DETAIL_PANEL_EDGE=1 or LEAD_DETAIL_PANEL_BENCH=1");

  test("comment draft, call before load, contact, status/add-status interrupts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const wallStart = Date.now();
    const stepMs: Record<string, number> = {};
    let stepAt = wallStart;
    const mark = (name: string) => {
      const now = Date.now();
      stepMs[name] = now - stepAt;
      stepAt = now;
    };

    if (!process.env.MONGODB_URI) {
      test.skip(true, "MONGODB_URI required for bench seed");
    }

    const meta = seedMinimalLead();
    mark("seed");
    const stamp = Date.now();
    const draftText = `E2E draft comment ${stamp} — should survive close/reopen`;
    const newStatusName = `E2E Edge Status ${stamp}`;
    const changeStatusName = `E2E Edge Change ${stamp}`;
    const revertStatusName = `E2E Edge Revert ${stamp}`;

    await loginAsFast(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await gotoAllLeadsForBench(page);
    mark("login");

    const sessionUserId = await fetchSessionUserId(page);

    await Promise.all(
      [changeStatusName, revertStatusName].map((name) =>
        apiJson(page, "/api/statuses", {
          method: "POST",
          body: JSON.stringify({ name, color: "#336699" }),
        }).then((res) => {
          expect([200, 201]).toContain(res.status);
        }),
      ),
    );
    await page.goto("/dashboard/all-leads", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /leads management/i })).toBeVisible({
      timeout: 10_000,
    });
    mark("statusSeed");

    let statuses = await listStatuses(page);
    const changeStatus = statuses.find((s) => s.name === changeStatusName)!;
    const revertStatus = statuses.find((s) => s.name === revertStatusName)!;

    const statusDelayPattern = new RegExp(
      `/api/leads/${meta.leadId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/status`,
    );
    const createStatusPattern = /\/api\/statuses$/;

    // --- Close while typing / draft reopen ---
    await openLeadDetailPanelOnly(page, meta.email);
    const textarea = await showCommentTextareaInPanel(page);
    await textarea.fill(draftText);
    const commentPostsBeforeClose: string[] = [];
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/comments")) {
        commentPostsBeforeClose.push(req.url());
      }
    });
    await closeLeadDetailPanel(page);
    expect(commentPostsBeforeClose).toHaveLength(0);
    expect(await readCommentDraftLocal(page, meta.leadId)).toBe(draftText);
    expect(await fetchCommentCount(page, meta.leadId)).toBe(0);
    report("close-while-typing", {
      commentPostCount: 0,
      commentCountOnServer: 0,
      draftInLocalStorage: true,
    });
    mark("draftClose");

    await openLeadDetailPanelOnly(page, meta.email, FAST_SEARCH);
    await expect(await showCommentTextareaInPanel(page)).toHaveValue(draftText, {
      timeout: 8_000,
    });
    const commentCountAfterReopen = await fetchCommentCount(page, meta.leadId);
    expect(commentCountAfterReopen).toBe(0);
    report("draft-after-reopen", {
      ok: true,
      commentCountOnServer: commentCountAfterReopen,
      draftRestored: true,
    });
    await closeLeadDetailPanel(page);
    mark("draftReopen");

    // --- Call before / after load (fresh panel open) ---
    const row = await searchLeadInTable(page, meta.email, { debounceMs: 0 });
    const panel = leadDetailsPanel(page);
    const callLogsBefore = await fetchCallLogsForLead(page, sessionUserId, meta.leadId);
    const leadDetailGet = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/leads/${meta.leadId}`) &&
        !r.url().includes("/comments") &&
        !r.url().includes("/activities") &&
        r.request().method() === "GET" &&
        r.ok(),
      { timeout: 15_000 },
    );
    const earlyCallLog = page
      .waitForResponse(
        (r) => r.url().includes("/api/calls/log") && r.request().method() === "POST",
        { timeout: 5_000 },
      )
      .catch(() => null);
    await row.click();
    await expect(panel.getByLabel("Close panel")).toBeVisible({ timeout: 8_000 });
    await panel.getByTitle("Click to call").click({ timeout: 2_000 }).catch(() => {});
    await leadDetailGet;
    const earlyCallResponse = await earlyCallLog;
    const logsAfterEarly = await fetchCallLogsForLead(page, sessionUserId, meta.leadId);
    expect(logsAfterEarly.length).toBeGreaterThan(callLogsBefore.length);
    const latestEarlyLog = logsAfterEarly[0];
    expect(latestEarlyLog?.leadId).toBe(meta.leadId);
    expect(latestEarlyLog?.phoneNumber).toBeTruthy();
    report("call-before-load", {
      earlyCallOutcome: earlyCallResponse ? "call-log-posted" : "inferred-from-get",
      callLogCountForLead: logsAfterEarly.length,
      latestCallLogLeadId: latestEarlyLog?.leadId,
      latestCallDialer: latestEarlyLog?.dialer,
    });
    mark("callBeforeLoad");

    const callLogAfterLoad = page.waitForResponse(
      (r) =>
        r.url().includes("/api/calls/log") &&
        r.request().method() === "POST" &&
        r.ok(),
      { timeout: 8_000 },
    );
    await clickCallButtonInPanel(page);
    const callBody = (await (await callLogAfterLoad).request().postDataJSON()) as {
      leadId?: string;
      dialer?: string;
    };
    expect(callBody.leadId).toBe(meta.leadId);
    const logsAfterSecondCall = await fetchCallLogsForLead(page, sessionUserId, meta.leadId);
    expect(logsAfterSecondCall.length).toBeGreaterThanOrEqual(logsAfterEarly.length);
    report("contact-section-call", {
      dialer: callBody.dialer ?? "tel",
      callLogCountForLead: logsAfterSecondCall.length,
    });
    await closeLeadDetailPanel(page);
    mark("contactCall");

    // --- Close panel during in-flight status change (PATCH must complete) ---
    await delayApiRoute(page, statusDelayPattern, INTERRUPT_DELAY_MS, ["PATCH"]);
    await openLeadDetailPanelOnly(page, meta.email, FAST_SEARCH);
    const statusPatchClose = page.waitForResponse(
      (r) => statusDelayPattern.test(r.url()) && r.request().method() === "PATCH",
      { timeout: 15_000 },
    );
    await selectLeadStatusInPanel(page, changeStatus.name);
    await closeLeadDetailPanel(page);
    expect((await statusPatchClose).ok()).toBeTruthy();
    await removeApiRouteDelay(page, statusDelayPattern);
    const serverAfterClose = await fetchLeadStatusRaw(page, meta.leadId);
    expect(resolveStatusName(statuses, serverAfterClose)).toBe(changeStatus.name);
    report("close-during-status-change", {
      intendedContract: "panel closes while PATCH in flight; server applies before unmount",
      statusApplied: changeStatus.name,
      serverStatus: resolveStatusName(statuses, serverAfterClose),
    });
    mark("statusClose");

    // --- Navigate away during in-flight status change ---
    await delayApiRoute(page, statusDelayPattern, INTERRUPT_DELAY_MS, ["PATCH"]);
    await openLeadDetailPanelOnly(page, meta.email, FAST_SEARCH);
    const statusPatchNav = page
      .waitForResponse(
        (r) => statusDelayPattern.test(r.url()) && r.request().method() === "PATCH",
        { timeout: 5_000 },
      )
      .catch(() => null);
    await selectLeadStatusInPanel(page, revertStatus.name);
    await navigateAwayFromPanel(page);
    const navStatusResponse = await statusPatchNav;
    await removeApiRouteDelay(page, statusDelayPattern);

    await gotoAllLeadsForBench(page);
    const serverRaw = await fetchLeadStatusRaw(page, meta.leadId);
    const serverStatus = resolveStatusName(statuses, serverRaw);
    await openLeadDetailPanelOnly(page, meta.email, FAST_SEARCH);
    const uiStatus = (
      (await leadDetailsPanel(page).getByRole("combobox").textContent()) ?? ""
    ).trim();
    const candidates = [changeStatus.name, revertStatus.name];
    expect(candidates.some((n) => uiStatus.includes(n))).toBe(true);
    expect(candidates).toContain(serverStatus);
    expect(uiStatus).toContain(serverStatus);
    report("navigate-during-status-change", {
      intendedContract:
        "navigation aborts client PATCH observation; server may or may not apply — UI and GET must agree",
      patchObservedByClient: Boolean(navStatusResponse?.ok()),
      uiStatus,
      serverStatus,
      serverMatchesUi: uiStatus.includes(serverStatus),
    });
    await closeLeadDetailPanel(page);
    mark("statusNavigate");

    // --- Close panel during Add Status (POST completes, then panel closes) ---
    await delayApiRoute(page, createStatusPattern, INTERRUPT_DELAY_MS, ["POST"]);
    await openLeadDetailPanelOnly(page, meta.email, FAST_SEARCH);
    await openAddStatusModal(page);
    await fillAddStatusForm(page, newStatusName);
    const createStatusClose = page.waitForResponse(
      (r) =>
        createStatusPattern.test(new URL(r.url()).pathname) &&
        r.request().method() === "POST",
      { timeout: 15_000 },
    );
    await submitAddStatusForm(page);
    expect((await createStatusClose).ok()).toBeTruthy();
    await dismissDialogIfOpen(page);
    await closeLeadDetailPanelIfOpen(page);
    await removeApiRouteDelay(page, createStatusPattern);

    statuses = await listStatuses(page);
    expect(statuses.some((s) => s.name === newStatusName)).toBe(true);
    report("close-during-add-status", {
      intendedContract: "POST completes before panel close; status is persisted",
      createdStatusName: newStatusName,
      statusExists: true,
    });
    mark("addStatusClose");

    // --- Navigate away during Add Status (POST aborted — status not created) ---
    const newStatusNameNav = `E2E Edge Status Nav ${stamp}`;
    await delayApiRoute(page, createStatusPattern, INTERRUPT_DELAY_MS, ["POST"]);
    await openLeadDetailPanelOnly(page, meta.email, FAST_SEARCH);
    await openAddStatusModal(page);
    await fillAddStatusForm(page, newStatusNameNav);
    const createStatusNav = page
      .waitForResponse(
        (r) =>
          createStatusPattern.test(new URL(r.url()).pathname) &&
          r.request().method() === "POST",
        { timeout: 5_000 },
      )
      .catch(() => null);
    await submitAddStatusForm(page);
    await navigateAwayFromPanel(page);
    const createStatusNavRes = await createStatusNav;
    await removeApiRouteDelay(page, createStatusPattern);

    statuses = await listStatuses(page);
    const navStatusCreated = statuses.some((s) => s.name === newStatusNameNav);
    expect(navStatusCreated).toBe(false);
    report("navigate-during-add-status", {
      intendedContract:
        "navigation aborts in-flight POST (no keepalive); status is not created",
      postObservedByClient: Boolean(createStatusNavRes?.ok()),
      createdStatusName: newStatusNameNav,
      statusExists: navStatusCreated,
    });
    mark("addStatusNavigate");

    report("timing", {
      totalMs: Date.now() - wallStart,
      interruptDelayMs: INTERRUPT_DELAY_MS,
      stepsMs: stepMs,
    });
  });
});

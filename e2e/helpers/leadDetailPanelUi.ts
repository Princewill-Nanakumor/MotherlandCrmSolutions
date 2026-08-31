import { expect, type Page, type Request, type Response } from "@playwright/test";
import { leadsDataTable } from "./assignmentUi";

export type LeadDetailApiCall = {
  path: string;
  method: string;
  requestStartedMs: number;
  responseMs: number;
  /** Wall clock from request listener to response listener (1 ms resolution). */
  durationMs: number;
  /** Playwright request.timing() wire time when available; sub-ms and not affected by duplicate-URL races. */
  resourceTimingMs: number | null;
  status: number;
  queueToHandlerMs?: number | null;
  handlerTotalMs?: number | null;
  inFlightAtEntry?: number | null;
  apiPerfMongo?: string | null;
};

export type LeadFetchMeasurement = {
  /** Best client estimate: max(resourceTimingMs, durationMs) across GET /api/leads/:id (no sub-routes). */
  clientMs: number | null;
  resourceTimingMs: number | null;
  wallDurationMs: number | null;
  serverHandlerMs: number | null;
  requestCount: number;
  /** True when every captured GET had 0 ms wall duration but server reported handler work. */
  suspectZeroWallMs: boolean;
  requests: Array<{
    wallDurationMs: number;
    resourceTimingMs: number | null;
    serverHandlerMs: number | null;
    startedMs: number;
    status: number;
  }>;
};

export type LeadDetailOpenTimings = {
  clickMs: number;
  panelVisibleMs: number;
  leadFetchMs: number | null;
  leadFetch: LeadFetchMeasurement;
  commentsFetchMs: number | null;
  activitiesFetchMs: number | null;
  remindersFetchMs: number | null;
  statusesFetchMs: number | null;
  timelineReadyMs: number | null;
  timelineDomCountMs: number | null;
  timelineItemCount: number;
  commentItemCount: number;
  activityItemCount: number;
  apiWaterfall: LeadDetailApiCall[];
};

function apiPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const m = url.match(/\/api\/[^?#]*/);
    return m?.[0] ?? url;
  }
}

/** Slide-over panel root (excludes the leads table behind it). */
export function leadDetailsPanel(page: Page) {
  return page
    .locator("div.fixed")
    .filter({ has: page.getByLabel("Close panel") })
    .last();
}

export async function gotoAllLeadsForBench(page: Page) {
  await page.goto("/dashboard/all-leads", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /leads management/i })).toBeVisible({
    timeout: 60_000,
  });
}

export async function searchLeadInTable(page: Page, email: string) {
  const search = page.getByPlaceholder(/search/i).first();
  if (await search.isVisible().catch(() => false)) {
    await search.fill(email);
    await page.waitForTimeout(400);
  }
  const row = leadsDataTable(page).locator("tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible({ timeout: 60_000 });
  return row;
}

function isLeadDetailGetPath(path: string, leadId: string): boolean {
  return (
    path === `/api/leads/${leadId}` ||
    path.startsWith(`/api/leads/${leadId}?`)
  );
}

function matchDetailApi(url: string, leadId: string, kind: string): boolean {
  if (!url.includes(`/api/leads/${leadId}`)) return false;
  if (kind === "lead") {
    return (
      !url.includes("/comments") &&
      !url.includes("/activities") &&
      !url.includes("/reminders")
    );
  }
  return url.includes(`/${kind}`);
}

function resourceTimingMsFromRequest(req: Request): number | null {
  try {
    const timing = req.timing();
    if (timing.responseEnd > 0 && timing.startTime >= 0) {
      return Math.round(timing.responseEnd - timing.startTime);
    }
  } catch {
    // timing() unavailable in some environments
  }
  return null;
}

function summarizeLeadFetch(calls: LeadDetailApiCall[], leadId: string): LeadFetchMeasurement {
  const gets = calls.filter(
    (c) => c.method === "GET" && isLeadDetailGetPath(c.path, leadId),
  );
  if (!gets.length) {
    return {
      clientMs: null,
      resourceTimingMs: null,
      wallDurationMs: null,
      serverHandlerMs: null,
      requestCount: 0,
      suspectZeroWallMs: false,
      requests: [],
    };
  }

  const requests = gets.map((c) => ({
    wallDurationMs: c.durationMs,
    resourceTimingMs: c.resourceTimingMs,
    serverHandlerMs: c.handlerTotalMs,
    startedMs: c.requestStartedMs,
    status: c.status,
  }));

  const bestResource = Math.max(
    ...gets.map((c) => c.resourceTimingMs ?? 0),
  );
  const bestWall = Math.max(...gets.map((c) => c.durationMs));
  const bestServer = Math.max(...gets.map((c) => c.handlerTotalMs ?? 0));
  const clientMs = Math.max(bestResource, bestWall) || null;
  const suspectZeroWallMs =
    gets.every((c) => c.durationMs === 0) &&
    gets.some((c) => (c.handlerTotalMs ?? 0) > 0 || (c.resourceTimingMs ?? 0) > 0);

  return {
    clientMs,
    resourceTimingMs: bestResource > 0 ? bestResource : null,
    wallDurationMs: bestWall,
    serverHandlerMs: bestServer > 0 ? bestServer : null,
    requestCount: gets.length,
    suspectZeroWallMs,
    requests,
  };
}

/** Prefer resource timing, then wall duration, then server handler for a single call. */
export function reliableClientMs(call: LeadDetailApiCall): number {
  return (
    call.resourceTimingMs ??
    call.durationMs ??
    call.handlerTotalMs ??
    0
  );
}

/**
 * Open lead detail slide-over from All Leads table; capture API waterfall + render phases.
 */
export async function openLeadDetailPanelAndMeasure(
  page: Page,
  email: string,
  leadId: string,
  opts?: { timelineMarker?: string; minTimelineItems?: number; waitForApis?: boolean },
): Promise<LeadDetailOpenTimings> {
  const panel = leadDetailsPanel(page);
  const marker =
    opts?.timelineMarker ?? "e2e.bench.comment.0 — detail panel timeline seed";
  const minItems = opts?.minTimelineItems ?? 20;

  const pending = new Map<Request, LeadDetailApiCall & { startedMs: number }>();
  const apiWaterfall: LeadDetailApiCall[] = [];
  const t0 = Date.now();

  const apiDurations: Record<string, number | null> = {
    lead: null,
    comments: null,
    activities: null,
    reminders: null,
    statuses: null,
  };

  const onRequest = (req: Request) => {
    const url = req.url();
    if (!url.includes("/api/")) return;
    pending.set(req, {
      path: apiPathFromUrl(url),
      method: req.method(),
      requestStartedMs: Date.now() - t0,
      responseMs: 0,
      durationMs: 0,
      resourceTimingMs: null,
      status: 0,
      startedMs: Date.now(),
    });
  };

  const onResponse = (res: Response) => {
    const req = res.request();
    const row = pending.get(req);
    if (!row) return;
    const url = res.url();
    const responseMs = Date.now() - t0;
    const durationMs = Date.now() - row.startedMs;
    const resourceTimingMs = resourceTimingMsFromRequest(req);
    const headers = res.headers();
    const handlerUnix = Number(headers["x-api-perf-handler-unix-ms"]);
    const queueToHandlerMs =
      Number.isFinite(handlerUnix) && handlerUnix > 0
        ? Math.max(0, handlerUnix - row.startedMs)
        : null;
    const inFlightRaw = headers["x-api-perf-in-flight-at-entry"];
    const entry: LeadDetailApiCall = {
      path: row.path,
      method: row.method,
      requestStartedMs: row.requestStartedMs,
      responseMs,
      durationMs,
      resourceTimingMs,
      status: res.status(),
      queueToHandlerMs,
      handlerTotalMs: headers["x-api-perf-total-ms"]
        ? Number(headers["x-api-perf-total-ms"])
        : null,
      inFlightAtEntry: inFlightRaw ? Number(inFlightRaw) : null,
      apiPerfMongo: headers["x-api-perf-mongo"] ?? null,
    };
    apiWaterfall.push(entry);
    pending.delete(req);

    if (matchDetailApi(url, leadId, "lead") && entry.method === "GET") {
      apiDurations.lead = reliableClientMs(entry);
    } else if (matchDetailApi(url, leadId, "comments") && entry.method === "GET") {
      apiDurations.comments = durationMs;
    } else if (matchDetailApi(url, leadId, "activities") && entry.method === "GET") {
      apiDurations.activities = durationMs;
    } else if (matchDetailApi(url, leadId, "reminders") && entry.method === "GET") {
      apiDurations.reminders = durationMs;
    } else if (entry.path === "/api/statuses" && entry.method === "GET") {
      apiDurations.statuses = durationMs;
    }
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  try {
    const row = await searchLeadInTable(page, email);
    const clickMs = Date.now() - t0;

    const waitForApis = opts?.waitForApis !== false;

    const detailResponses = waitForApis
      ? Promise.all([
          page.waitForResponse(
            (r) =>
              matchDetailApi(r.url(), leadId, "lead") &&
              r.request().method() === "GET" &&
              r.ok(),
            { timeout: 120_000 },
          ),
          page.waitForResponse(
            (r) =>
              matchDetailApi(r.url(), leadId, "comments") &&
              r.request().method() === "GET" &&
              r.ok(),
            { timeout: 120_000 },
          ),
          page.waitForResponse(
            (r) =>
              matchDetailApi(r.url(), leadId, "activities") &&
              r.request().method() === "GET" &&
              r.ok(),
            { timeout: 120_000 },
          ),
          page.waitForResponse(
            (r) =>
              matchDetailApi(r.url(), leadId, "reminders") &&
              r.request().method() === "GET" &&
              r.ok(),
            { timeout: 120_000 },
          ),
        ])
      : null;

    await row.click();
    if (detailResponses) {
      await detailResponses;
    }

    await expect(panel.getByLabel("Close panel")).toBeVisible({ timeout: 60_000 });
    const panelVisibleMs = Date.now() - t0;

    await expect(panel.locator(".animate-spin").first()).toBeHidden({
      timeout: 120_000,
    });

    await expect(panel.getByText(marker).first()).toBeVisible({ timeout: 120_000 });
    const timelineReadyMs = Date.now() - t0;

    await expect
      .poll(
        async () =>
          panel.locator("p", { hasText: /^e2e\.bench\.comment\.\d+/ }).count(),
        { timeout: 120_000 },
      )
      .toBeGreaterThanOrEqual(Math.min(minItems, 100));

    const commentItemCount = await panel
      .locator("p", { hasText: /^e2e\.bench\.comment\.\d+/ })
      .count();
    const activityItemCount = await panel.getByText("changed status").count();
    const timelineItemCount = commentItemCount + activityItemCount;
    const timelineDomCountMs = Date.now() - t0;

    apiWaterfall.sort((a, b) => a.requestStartedMs - b.requestStartedMs);
    const leadFetch = summarizeLeadFetch(apiWaterfall, leadId);

    return {
      clickMs,
      panelVisibleMs,
      leadFetchMs: leadFetch.clientMs,
      leadFetch,
      commentsFetchMs: apiDurations.comments,
      activitiesFetchMs: apiDurations.activities,
      remindersFetchMs: apiDurations.reminders,
      statusesFetchMs: apiDurations.statuses,
      timelineReadyMs,
      timelineDomCountMs,
      timelineItemCount,
      commentItemCount,
      activityItemCount,
      apiWaterfall,
    };
  } finally {
    page.off("request", onRequest);
    page.off("response", onResponse);
  }
}

export async function switchToRemindersTab(page: Page) {
  const panel = leadDetailsPanel(page);
  const t0 = Date.now();
  await panel.getByRole("button", { name: /^Reminders/i }).click();
  await expect(panel.getByRole("button", { name: /add reminder/i })).toBeVisible({
    timeout: 30_000,
  });
  return Date.now() - t0;
}

export async function switchToCommentsTab(page: Page) {
  const panel = leadDetailsPanel(page);
  await panel.getByRole("button", { name: /Comments/i }).first().click();
  await expect(panel.getByPlaceholder(/write your thoughts/i)).toBeVisible({
    timeout: 30_000,
  });
}

export async function addCommentInPanel(page: Page, text: string) {
  const panel = leadDetailsPanel(page);
  const t0 = Date.now();
  const toggle = panel.getByTitle(/show comment textarea/i);
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }
  const textarea = panel.getByPlaceholder(/write your thoughts/i);
  await expect(textarea).toBeVisible({ timeout: 15_000 });
  await textarea.fill(text);
  await panel.getByRole("button", { name: /add comment/i }).click();
  await expect(panel.getByText(text).first()).toBeVisible({ timeout: 30_000 });
  return {
    addCommentMs: Date.now() - t0,
    commentVisibleMs: Date.now() - t0,
  };
}

function parseApiPerfFromResponse(
  headers: { [key: string]: string },
  clientStartUnixMs: number,
) {
  const handlerUnix = Number(headers["x-api-perf-handler-unix-ms"]);
  const queueToHandlerMs =
    Number.isFinite(handlerUnix) && handlerUnix > 0
      ? Math.max(0, handlerUnix - clientStartUnixMs)
      : null;
  return {
    queueToHandlerMs,
    apiPerfMongo: headers["x-api-perf-mongo"] ?? null,
    apiPerfSession: headers["x-api-perf-session"] ?? null,
  };
}

export async function deleteCommentInPanel(page: Page, commentText: string) {
  const panel = leadDetailsPanel(page);
  const t0 = Date.now();
  const row = panel.locator("div.group").filter({ hasText: commentText }).first();
  await row.hover();
  await row.getByRole("button").nth(1).click();
  const deleteResponsePromise = page.waitForResponse(
    (res) =>
      res.request().method() === "DELETE" &&
      res.url().includes("/comments/") &&
      res.ok(),
  );
  const tDeleteClick = Date.now();
  await page.getByRole("button", { name: /delete comment/i }).click();
  const deleteResponse = await deleteResponsePromise;
  const deleteCommentApiMs = Date.now() - tDeleteClick;
  const perfMeta = parseApiPerfFromResponse(
    deleteResponse.headers(),
    tDeleteClick,
  );
  await expect(
    panel.locator("div.group").filter({ hasText: commentText }),
  ).toHaveCount(0, { timeout: 30_000 });
  return {
    deleteCommentMs: Date.now() - t0,
    deleteCommentUiMs: tDeleteClick - t0,
    deleteCommentApiMs,
    deleteCommentQueueToHandlerMs: perfMeta.queueToHandlerMs,
    deleteCommentDomMs: Date.now() - tDeleteClick - deleteCommentApiMs,
    deleteCommentApiPerf: deleteResponse.headers()["x-api-perf-stages"] ?? null,
    deleteCommentApiTotalMs: deleteResponse.headers()["x-api-perf-total-ms"] ?? null,
    deleteCommentInFlightAtEntry:
      deleteResponse.headers()["x-api-perf-in-flight-at-entry"] ?? null,
    deleteCommentApiMongo: perfMeta.apiPerfMongo,
    deleteCommentApiSession: perfMeta.apiPerfSession,
  };
}

export async function deleteReminderInPanel(page: Page, title: string) {
  const panel = leadDetailsPanel(page);
  const t0 = Date.now();
  const card = panel
    .getByRole("heading", { name: title, exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
  await card.getByTitle(/more actions/i).click();
  await page.getByRole("menuitem", { name: /^Delete$/i }).click();
  const deleteResponsePromise = page.waitForResponse(
    (res) =>
      res.request().method() === "DELETE" &&
      res.url().includes("/reminders/") &&
      res.ok(),
  );
  const tDeleteClick = Date.now();
  await page.getByRole("button", { name: /delete reminder/i }).click();
  const deleteResponse = await deleteResponsePromise;
  const deleteReminderApiMs = Date.now() - tDeleteClick;
  const perfMeta = parseApiPerfFromResponse(
    deleteResponse.headers(),
    tDeleteClick,
  );
  await expect(
    panel.getByRole("heading", { name: title, exact: true }),
  ).toHaveCount(0, { timeout: 30_000 });
  return {
    deleteReminderMs: Date.now() - t0,
    deleteReminderUiMs: tDeleteClick - t0,
    deleteReminderApiMs,
    deleteReminderQueueToHandlerMs: perfMeta.queueToHandlerMs,
    deleteReminderDomMs: Date.now() - tDeleteClick - deleteReminderApiMs,
    deleteReminderApiPerf: deleteResponse.headers()["x-api-perf-stages"] ?? null,
    deleteReminderApiTotalMs: deleteResponse.headers()["x-api-perf-total-ms"] ?? null,
    deleteReminderApiMongo: perfMeta.apiPerfMongo,
    deleteReminderApiSession: perfMeta.apiPerfSession,
  };
}

export async function closeLeadDetailPanel(page: Page) {
  const t0 = Date.now();
  await page.getByLabel("Close panel").click();
  await expect(page.getByLabel("Close panel")).toBeHidden({ timeout: 15_000 });
  return Date.now() - t0;
}

export function summarizeQueueContention(calls: LeadDetailApiCall[]) {
  const byInFlight = new Map<number, number[]>();
  for (const c of calls) {
    if (c.queueToHandlerMs == null || c.inFlightAtEntry == null) continue;
    const list = byInFlight.get(c.inFlightAtEntry) ?? [];
    list.push(c.queueToHandlerMs);
    byInFlight.set(c.inFlightAtEntry, list);
  }
  const queueByInFlightAtEntry: Record<
    string,
    { count: number; medianQueueMs: number }
  > = {};
  for (const [inFlight, vals] of byInFlight) {
    const sorted = [...vals].sort((a, b) => a - b);
    queueByInFlightAtEntry[String(inFlight)] = {
      count: vals.length,
      medianQueueMs: sorted[Math.floor(sorted.length / 2)] ?? 0,
    };
  }
  return queueByInFlightAtEntry;
}

export function formatApiWaterfall(calls: LeadDetailApiCall[], limit = 20): string {
  const detail = calls.filter((c) => c.path.includes("/api/leads/"));
  if (!detail.length) return "  (no lead detail /api calls)";
  return detail
    .slice(0, limit)
    .map((c) => {
      const ms =
        c.durationMs > 0
          ? c.durationMs
          : c.resourceTimingMs ?? c.handlerTotalMs ?? c.durationMs;
      const note =
        c.durationMs === 0 && (c.resourceTimingMs ?? 0) > 0
          ? " (wall 0, resource)"
          : c.durationMs === 0 && (c.handlerTotalMs ?? 0) > 0
            ? " (wall 0, server)"
            : "";
      return `  +${String(c.requestStartedMs).padStart(5)} ms  ${String(ms).padStart(5)} ms  ${c.status} ${c.method} ${c.path}${note}`;
    })
    .join("\n");
}

import { expect, type Page, type Response } from "@playwright/test";
import { apiJson } from "./auth";
import { leadsDataTable } from "./assignmentUi";

/** Browser PerformanceResourceTiming breakdown for the leads API call. */
export type ResourceTimingBreakdown = {
  queuedMs: number;
  dnsMs: number;
  connectMs: number;
  tlsMs: number;
  ttfbMs: number;
  downloadMs: number;
  totalMs: number;
};

/** Any /api/* request observed during a page navigation (relative to nav start). */
export type StartupApiCall = {
  path: string;
  method: string;
  requestStartedMs: number;
  responseMs: number;
  durationMs: number;
};

/**
 * Phases for a leads page load (wall-clock from navigation start).
 *
 * `navigationMs` = domcontentloaded (HTML + parser; mostly JS bundle download/parse).
 * `apiResponseMs` = nav start → leads API response (includes hydration/queue + wire).
 * `apiWireMs` = leads request sent → response (compare to direct fetch).
 */
export type LeadsUiPhases = {
  navigationMs: number;
  apiRequestStartedMs: number | null;
  hydrationAndQueueMs: number | null;
  apiResponseMs: number | null;
  apiWireMs: number | null;
  /** Playwright request.timing() when available */
  apiResourceTimingMs: number | null;
  /** performance.getEntriesByType('resource') for the leads URL */
  apiPerformanceTiming: ResourceTimingBreakdown | null;
  firstTableRowMs: number;
  afterApiUntilRowMs: number | null;
  totalMs: number;
  apiPath: string;
  /** Server-reported route time (X-Api-Perf-Total-Ms / Server-Timing) */
  serverTimingMs: number | null;
  /** All /api/* calls during this navigation, sorted by request start */
  startupApiWaterfall: StartupApiCall[];
  note?: string;
};

export type DirectVsUiApiCompare = {
  apiPath: string;
  /**
   * Isolated fetch after UI navigation. Can exceed UI wire when the dev server
   * is still compiling or contending — prefer `ui.apiWireMs` for startup work.
   */
  directFetchMs: number;
  ui: LeadsUiPhases;
  wireOverheadVsDirectMs: number | null;
  totalUiApiPhaseVsDirectMs: number | null;
  directFetchReliable: boolean;
};

export type BenchRuntime = "development" | "production";

export type BenchWarmth = "cold" | "warm";

/** One page-load measurement for startup benchmarking. */
export type StartupPageMetrics = {
  page: "allLeads" | "agent";
  runtime: BenchRuntime;
  warmth: BenchWarmth;
  navigationMs: number;
  hydrationAndQueueMs: number | null;
  apiRequestStartedMs: number | null;
  apiWireMs: number | null;
  apiTtfbMs: number | null;
  serverTimingMs: number | null;
  firstTableRowMs: number;
  afterApiUntilRowMs: number | null;
  /**
   * Fetch in a quiet window after UI phases (optional). More reliable than
   * post-UI direct fetch inside compareDirectFetchVsUiNavigation.
   */
  isolatedApiWireMs: number | null;
  startupApiWaterfall: StartupApiCall[];
  note?: string;
};

export type ColdWarmStartupPair = {
  cold: StartupPageMetrics;
  warm: StartupPageMetrics;
};

type MeasureOptions = {
  apiPathIncludes: string;
  apiOptional?: boolean;
  note?: string;
  /** Reload current URL instead of goto (warm navigation). */
  reload?: boolean;
};

function apiPathFromUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    const m = url.match(/\/api\/[^?#]*/);
    return m?.[0] ?? url;
  }
}

/** Playwright `response.headers()` is a lowercase key record, not a Headers object. */
function headerValue(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const key = name.toLowerCase();
  return headers[key] ?? headers[name];
}

function parseServerTimingMs(headers: Record<string, string>): number | null {
  const explicit = headerValue(headers, "x-api-perf-total-ms");
  if (explicit) {
    const n = Number.parseFloat(explicit);
    if (Number.isFinite(n)) return Math.round(n);
  }
  const st = headerValue(headers, "server-timing");
  if (!st) return null;
  const m = st.match(/(?:^|;)\s*total;dur=([0-9.]+)/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function benchRuntimeFromEnv(): BenchRuntime {
  return process.env.LEADS_BENCH_RUNTIME === "production"
    ? "production"
    : "development";
}

function matchesLeadsApi(url: string, apiPathIncludes: string, method: string) {
  return (
    method === "GET" &&
    url.includes(apiPathIncludes) &&
    url.includes("/api/")
  );
}

async function readPerformanceTiming(
  page: Page,
  urlIncludes: string,
): Promise<ResourceTimingBreakdown | null> {
  return page.evaluate((needle) => {
    const entries = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const match = entries
      .filter((e) => e.name.includes(needle))
      .sort((a, b) => b.responseEnd - a.responseEnd)[0];
    if (!match || match.responseEnd <= 0) return null;

    const queuedMs = Math.max(0, match.requestStart - match.startTime);
    const dnsMs = Math.max(0, match.domainLookupEnd - match.domainLookupStart);
    const connectMs = Math.max(0, match.connectEnd - match.connectStart);
    const tlsMs = Math.max(0, (match.secureConnectionStart || 0) > 0
      ? match.connectEnd - match.secureConnectionStart
      : 0);
    const ttfbMs = Math.max(0, match.responseStart - match.requestStart);
    const downloadMs = Math.max(0, match.responseEnd - match.responseStart);
    const totalMs = Math.max(0, match.responseEnd - match.startTime);

    return { queuedMs, dnsMs, connectMs, tlsMs, ttfbMs, downloadMs, totalMs };
  }, urlIncludes);
}

/**
 * Break end-to-end UI load into navigation / hydration / API wire / render.
 */
export async function measureLeadsPagePhases(
  page: Page,
  url: string,
  options: MeasureOptions,
): Promise<LeadsUiPhases> {
  const timeoutMs = 120_000;
  const t0 = Date.now();
  let apiRequestStartedMs: number | null = null;
  let apiResponseMs: number | null = null;
  let apiWireMs: number | null = null;
  let apiResourceTimingMs: number | null = null;
  let serverTimingMs: number | null = null;
  let leadsResponseUrl: string | null = null;

  const pendingRequests = new Map<
    string,
    { path: string; method: string; startedMs: number }
  >();
  const startupApiWaterfall: StartupApiCall[] = [];

  const onRequest = (req: {
    url: () => string;
    method: () => string;
  }) => {
    const reqUrl = req.url();
    if (!reqUrl.includes("/api/")) return;

    const path = apiPathFromUrl(reqUrl);
    const method = req.method();
    const startedMs = Date.now() - t0;
    pendingRequests.set(reqUrl, { path, method, startedMs });

    if (
      apiRequestStartedMs == null &&
      matchesLeadsApi(reqUrl, options.apiPathIncludes, method)
    ) {
      apiRequestStartedMs = startedMs;
    }
  };

  const onResponse = (res: Response) => {
    const reqUrl = res.url();
    const pending = pendingRequests.get(reqUrl);
    if (pending) {
      const responseMs = Date.now() - t0;
      startupApiWaterfall.push({
        path: pending.path,
        method: pending.method,
        requestStartedMs: pending.startedMs,
        responseMs,
        durationMs: responseMs - pending.startedMs,
      });
      pendingRequests.delete(reqUrl);
    }

    if (apiResponseMs != null) return;
    const req = res.request();
    if (!matchesLeadsApi(reqUrl, options.apiPathIncludes, req.method())) {
      return;
    }
    if (!res.ok()) return;

    leadsResponseUrl = reqUrl;
    apiResponseMs = Date.now() - t0;
    if (apiRequestStartedMs != null) {
      apiWireMs = apiResponseMs - apiRequestStartedMs;
    }
    serverTimingMs = parseServerTimingMs(res.headers());

    try {
      const timing = req.timing();
      if (timing.responseEnd > 0 && timing.startTime >= 0) {
        apiResourceTimingMs = Math.round(timing.responseEnd - timing.startTime);
      }
    } catch {
      // timing() unavailable in some environments
    }
  };

  page.on("request", onRequest);
  page.on("response", onResponse);

  try {
    if (options.reload) {
      await page.reload({ waitUntil: "domcontentloaded" });
    } else {
      await page.goto(url, { waitUntil: "domcontentloaded" });
    }
    const navigationMs = Date.now() - t0;

    if (apiResponseMs == null) {
      try {
        const res = await page.waitForResponse(
          (r) =>
            matchesLeadsApi(
              r.url(),
              options.apiPathIncludes,
              r.request().method(),
            ) && r.ok(),
          { timeout: timeoutMs },
        );
        leadsResponseUrl = res.url();
        if (apiResponseMs == null) {
          apiResponseMs = Date.now() - t0;
        }
        if (apiRequestStartedMs != null && apiWireMs == null) {
          apiWireMs = apiResponseMs - apiRequestStartedMs;
        }
        if (serverTimingMs == null) {
          serverTimingMs = parseServerTimingMs(res.headers());
        }
      } catch {
        if (!options.apiOptional) {
          throw new Error(
            `Expected GET ${options.apiPathIncludes} during ${url}`,
          );
        }
      }
    }

    await expect(leadsDataTable(page).locator("tbody tr").first()).toBeVisible({
      timeout: timeoutMs,
    });
    const firstTableRowMs = Date.now() - t0;

    const apiPerformanceTiming = leadsResponseUrl
      ? await readPerformanceTiming(page, options.apiPathIncludes)
      : null;

    startupApiWaterfall.sort(
      (a, b) => a.requestStartedMs - b.requestStartedMs,
    );

    const hydrationAndQueueMs =
      apiRequestStartedMs != null ? apiRequestStartedMs - navigationMs : null;

    return {
      navigationMs,
      apiRequestStartedMs,
      hydrationAndQueueMs,
      apiResponseMs,
      apiWireMs,
      apiResourceTimingMs,
      apiPerformanceTiming,
      firstTableRowMs,
      afterApiUntilRowMs:
        apiResponseMs != null ? firstTableRowMs - apiResponseMs : null,
      totalMs: firstTableRowMs,
      apiPath: options.apiPathIncludes,
      serverTimingMs,
      startupApiWaterfall,
      note: options.note,
    };
  } finally {
    page.off("request", onRequest);
    page.off("response", onResponse);
  }
}

export async function measureAgentClientFilterPhases(
  page: Page,
  url: string,
): Promise<LeadsUiPhases> {
  const timeoutMs = 60_000;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const navigationMs = Date.now() - t0;

  await expect(leadsDataTable(page).locator("tbody tr").first()).toBeVisible({
    timeout: timeoutMs,
  });
  const firstTableRowMs = Date.now() - t0;

  return {
    navigationMs,
    apiRequestStartedMs: null,
    hydrationAndQueueMs: null,
    apiResponseMs: null,
    apiWireMs: null,
    apiResourceTimingMs: null,
    apiPerformanceTiming: null,
    firstTableRowMs,
    afterApiUntilRowMs: null,
    totalMs: firstTableRowMs,
    apiPath: "/api/leads/assigned",
    serverTimingMs: null,
    startupApiWaterfall: [],
    note: "client-side filter on cached assigned leads (no new API)",
  };
}

/** UI navigation first, then isolated fetch (secondary — can be distorted by dev compile). */
export async function compareDirectFetchVsUiNavigation(
  page: Page,
  uiUrl: string,
  apiPath: string,
  apiPathIncludes: string,
): Promise<DirectVsUiApiCompare> {
  const ui = await measureLeadsPagePhases(page, uiUrl, { apiPathIncludes });

  const tDirect = Date.now();
  const direct = await apiJson(page, apiPath);
  const directFetchMs = Date.now() - tDirect;
  expect(direct.status).toBe(200);

  const directFetchReliable =
    ui.apiWireMs != null &&
    directFetchMs <= ui.apiWireMs * 1.35 &&
    directFetchMs <= ui.apiWireMs + 400;

  return {
    apiPath,
    directFetchMs,
    ui,
    wireOverheadVsDirectMs:
      ui.apiWireMs != null ? ui.apiWireMs - directFetchMs : null,
    totalUiApiPhaseVsDirectMs:
      ui.apiResponseMs != null ? ui.apiResponseMs - directFetchMs : null,
    directFetchReliable,
  };
}

function phasesToStartupMetrics(
  page: "allLeads" | "agent",
  warmth: BenchWarmth,
  phases: LeadsUiPhases,
  isolatedApiWireMs: number | null,
): StartupPageMetrics {
  return {
    page,
    runtime: benchRuntimeFromEnv(),
    warmth,
    navigationMs: phases.navigationMs,
    hydrationAndQueueMs: phases.hydrationAndQueueMs,
    apiRequestStartedMs: phases.apiRequestStartedMs,
    apiWireMs: phases.apiWireMs,
    apiTtfbMs: phases.apiPerformanceTiming?.ttfbMs ?? null,
    serverTimingMs: phases.serverTimingMs,
    firstTableRowMs: phases.firstTableRowMs,
    afterApiUntilRowMs: phases.afterApiUntilRowMs,
    isolatedApiWireMs,
    startupApiWaterfall: phases.startupApiWaterfall,
    note: phases.note,
  };
}

/** Isolated API fetch when the server is quiet (after UI settle). */
export async function measureIsolatedApiWire(
  page: Page,
  apiPath: string,
): Promise<number> {
  await page.waitForTimeout(250);
  const t0 = Date.now();
  const res = await apiJson(page, apiPath);
  const ms = Date.now() - t0;
  expect(res.status).toBe(200);
  return ms;
}

/**
 * Cold navigation (goto) then warm navigation (reload) on the same page/session.
 */
export async function measureColdWarmStartup(
  page: Page,
  url: string,
  apiPathIncludes: string,
  pageKind: "allLeads" | "agent",
  apiPathForIsolated?: string,
): Promise<ColdWarmStartupPair> {
  const coldPhases = await measureLeadsPagePhases(page, url, {
    apiPathIncludes,
  });
  const coldIsolated = apiPathForIsolated
    ? await measureIsolatedApiWire(page, apiPathForIsolated)
    : null;

  const warmPhases = await measureLeadsPagePhases(page, url, {
    apiPathIncludes,
    reload: true,
  });
  const warmIsolated = apiPathForIsolated
    ? await measureIsolatedApiWire(page, apiPathForIsolated)
    : null;

  return {
    cold: phasesToStartupMetrics(pageKind, "cold", coldPhases, coldIsolated),
    warm: phasesToStartupMetrics(pageKind, "warm", warmPhases, warmIsolated),
  };
}

export function formatStartupMetrics(m: StartupPageMetrics): string {
  const label = `${m.runtime} / ${m.warmth} / ${m.page}`;
  return [
    `  [${label}]`,
    `    DOMContentLoaded:        ${m.navigationMs} ms`,
    `    hydration/queue:         ${m.hydrationAndQueueMs ?? "n/a"} ms`,
    `    API request start:       ${m.apiRequestStartedMs ?? "n/a"} ms`,
    `    UI API wire:             ${m.apiWireMs ?? "n/a"} ms`,
    `    API TTFB (browser):      ${m.apiTtfbMs ?? "n/a"} ms`,
    `    API server timing:       ${m.serverTimingMs ?? "n/a"} ms`,
    `    isolated API wire:       ${m.isolatedApiWireMs ?? "n/a"} ms`,
    `    first table row:         ${m.firstTableRowMs} ms`,
    `    render after API:        ${m.afterApiUntilRowMs ?? "n/a"} ms`,
  ].join("\n");
}

export function formatStartupReport(report: {
  runtime: BenchRuntime;
  allLeads: ColdWarmStartupPair;
  agent: ColdWarmStartupPair;
  note?: string;
}): string {
  const lines = [
    `=== Leads startup bench (${report.runtime}) ===`,
    report.note ?? "",
    "",
    "ALL LEADS",
    formatStartupMetrics(report.allLeads.cold),
    formatStartupMetrics(report.allLeads.warm),
    "",
    "AGENT",
    formatStartupMetrics(report.agent.cold),
    formatStartupMetrics(report.agent.warm),
    "",
    "Interpretation:",
    "  • cold = first navigation in this browser context (may include Next.js dev route compile)",
    "  • warm = reload of the same URL in the same session",
    "  • UI API wire = primary client metric; isolated API wire = quiet-window fetch",
    "  • production (next start) numbers are the ones to optimize against",
  ].filter(Boolean);
  return lines.join("\n");
}

export function payloadStats(payloadBytes: number, leadCount: number) {
  const rows = Math.max(1, Math.min(leadCount, 500));
  const bytesPerLead = Math.round(payloadBytes / rows);
  return {
    payloadBytes,
    payloadKb: +(payloadBytes / 1024).toFixed(1),
    bytesPerLead,
    kbPerLead: +(bytesPerLead / 1024).toFixed(3),
    estimatedMaxPagePayloadKbAt500: +((bytesPerLead * 500) / 1024).toFixed(1),
  };
}

export function formatWaterfall(calls: StartupApiCall[], limit = 12): string {
  if (calls.length === 0) return "  (no /api calls captured)";
  return calls
    .slice(0, limit)
    .map(
      (c) =>
        `  +${String(c.requestStartedMs).padStart(5)} ms  ${c.durationMs.toString().padStart(4)} ms  ${c.method} ${c.path}`,
    )
    .join("\n");
}

export function formatUiPhases(label: string, phases: LeadsUiPhases): string {
  const pt = phases.apiPerformanceTiming;
  const lines = [
    `=== ${label} ===`,
    `  Navigation (domcontentloaded):     ${phases.navigationMs} ms`,
    phases.hydrationAndQueueMs != null
      ? `  Hydration → API request sent:    ${phases.hydrationAndQueueMs} ms`
      : null,
    phases.apiWireMs != null
      ? `  API wire (request → response):   ${phases.apiWireMs} ms`
      : null,
    phases.apiResourceTimingMs != null
      ? `  API timing (Playwright):         ${phases.apiResourceTimingMs} ms`
      : null,
    pt
      ? `  API timing (Performance API):    ${pt.totalMs} ms (TTFB ${pt.ttfbMs}, download ${pt.downloadMs}, queued ${pt.queuedMs})`
      : null,
    phases.apiResponseMs != null
      ? `  API response (from nav start):   ${phases.apiResponseMs} ms`
      : `  API response:                    (none — ${phases.note ?? "optional"})`,
    phases.afterApiUntilRowMs != null
      ? `  After API → first row:           ${phases.afterApiUntilRowMs} ms`
      : null,
    `  First table row visible:           ${phases.firstTableRowMs} ms`,
    phases.startupApiWaterfall.length > 0
      ? `  Startup /api waterfall:\n${formatWaterfall(phases.startupApiWaterfall)}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function formatDirectVsUi(label: string, compare: DirectVsUiApiCompare): string {
  const { directFetchMs, ui, directFetchReliable } = compare;
  const navPct =
    ui.firstTableRowMs > 0
      ? Math.round((ui.navigationMs / ui.firstTableRowMs) * 100)
      : 0;
  const renderPct =
    ui.afterApiUntilRowMs != null && ui.firstTableRowMs > 0
      ? Math.round((ui.afterApiUntilRowMs / ui.firstTableRowMs) * 100)
      : 0;

  return [
    `=== ${label} — UI navigation (primary) ===`,
    `  UI API wire (request → response):  ${ui.apiWireMs ?? "n/a"} ms  ← primary API metric`,
    `  API server timing (header):        ${ui.serverTimingMs ?? "n/a"} ms`,
    compare.directFetchReliable
      ? `  Isolated fetch (after UI):         ${directFetchMs} ms`
      : `  Isolated fetch (after UI):         ${directFetchMs} ms  ⚠ unreliable (dev compile/contention; trust UI wire)`,
    `  UI apiResponseMs (from nav start): ${ui.apiResponseMs ?? "n/a"} ms`,
    `  Budget (@ first row ${ui.firstTableRowMs} ms):`,
    `    navigation:        ${ui.navigationMs} ms (~${navPct}%)`,
    `    hydration/queue:   ${ui.hydrationAndQueueMs ?? "n/a"} ms`,
    `    API wire:          ${ui.apiWireMs ?? "n/a"} ms`,
    `    render after API:  ${ui.afterApiUntilRowMs ?? "n/a"} ms (~${renderPct}%)`,
  ].join("\n");
}

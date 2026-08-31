/**
 * Opt-in API route timing for startup perf investigation.
 * Enabled when API_PERF_TIMING=1, LEADS_FILTER_BENCH=1, or NODE_ENV=development
 * (disable in dev with API_PERF_TIMING=0).
 */
export function isApiPerfTimingEnabled(): boolean {
  if (process.env.API_PERF_TIMING === "0") return false;
  return (
    process.env.API_PERF_TIMING === "1" ||
    process.env.LEADS_FILTER_BENCH === "1" ||
    process.env.LEAD_DETAIL_PANEL_BENCH === "1" ||
    process.env.NODE_ENV === "development"
  );
}

/** Routes currently inside an instrumented handler (contention signal). */
let inFlightApiRoutes = 0;

export function apiRoutesInFlight(): number {
  return inFlightApiRoutes;
}

export class ApiRoutePerf {
  private readonly t0 = performance.now();
  private readonly entryUnixMs = Date.now();
  private readonly inFlightAtEntry: number;
  private readonly marks: Array<{ label: string; ms: number }> = [];

  constructor(private readonly route: string) {
    if (isApiPerfTimingEnabled()) {
      inFlightApiRoutes += 1;
      this.inFlightAtEntry = inFlightApiRoutes;
    } else {
      this.inFlightAtEntry = 0;
    }
  }

  /** Wall-clock ms when this route handler was entered (for client queue math). */
  getHandlerEntryUnixMs(): number {
    return this.entryUnixMs;
  }

  mark(label: string): void {
    if (!isApiPerfTimingEnabled()) return;
    this.marks.push({ label, ms: performance.now() - this.t0 });
  }

  finish(extra?: Record<string, unknown>): void {
    if (!isApiPerfTimingEnabled()) return;
    const total = performance.now() - this.t0;
    inFlightApiRoutes = Math.max(0, inFlightApiRoutes - 1);
    const lines = this.marks.map((m) => `  ${m.label}: ${m.ms.toFixed(1)}ms`);
    const suffix = extra
      ? ` ${JSON.stringify({ inFlightAtEntry: this.inFlightAtEntry, ...extra })}`
      : ` ${JSON.stringify({ inFlightAtEntry: this.inFlightAtEntry })}`;
    console.log(
      `[api-perf] ${this.route} total=${total.toFixed(1)}ms\n${lines.join("\n")}${suffix}`,
    );
  }

  /** Cumulative marks from `mark()` (empty when timing is disabled). */
  getMarks(): ReadonlyArray<{ label: string; ms: number }> {
    return this.marks;
  }

  /** Expose route timing to clients (startup bench / E2E sync tests read these). */
  responseHeaders(): Record<string, string> {
    if (!isApiPerfTimingEnabled()) return {};
    const total = performance.now() - this.t0;
    const stages = this.marks
      .map((m) => `${m.label};dur=${m.ms.toFixed(2)}`)
      .join(", ");
    return {
      "Server-Timing": [`total;dur=${total.toFixed(2)}`, stages]
        .filter(Boolean)
        .join(", "),
      "X-Api-Perf-Total-Ms": total.toFixed(2),
      "X-Api-Perf-Handler-Unix-Ms": String(this.entryUnixMs),
      "X-Api-Perf-In-Flight-At-Entry": String(this.inFlightAtEntry),
      ...(this.marks.length
        ? {
            "X-Api-Perf-Stages": this.marks
              .map((m) => `${m.label}=${m.ms.toFixed(1)}`)
              .join("|"),
          }
        : {}),
    };
  }
}

export async function timed<T>(
  perf: ApiRoutePerf | undefined,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const result = await fn();
  perf?.mark(label);
  return result;
}

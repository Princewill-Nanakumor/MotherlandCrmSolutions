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
    process.env.NODE_ENV === "development"
  );
}

export class ApiRoutePerf {
  private readonly t0 = performance.now();
  private readonly marks: Array<{ label: string; ms: number }> = [];

  constructor(private readonly route: string) {}

  mark(label: string): void {
    if (!isApiPerfTimingEnabled()) return;
    this.marks.push({ label, ms: performance.now() - this.t0 });
  }

  finish(extra?: Record<string, unknown>): void {
    if (!isApiPerfTimingEnabled()) return;
    const total = performance.now() - this.t0;
    const lines = this.marks.map((m) => `  ${m.label}: ${m.ms.toFixed(1)}ms`);
    const suffix = extra ? ` ${JSON.stringify(extra)}` : "";
    console.log(
      `[api-perf] ${this.route} total=${total.toFixed(1)}ms\n${lines.join("\n")}${suffix}`,
    );
  }

  /** Expose route timing to clients (startup bench reads this header). */
  responseHeaders(): Record<string, string> {
    if (!isApiPerfTimingEnabled()) return {};
    const total = performance.now() - this.t0;
    return {
      "Server-Timing": `total;dur=${total.toFixed(2)}`,
      "X-Api-Perf-Total-Ms": total.toFixed(2),
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

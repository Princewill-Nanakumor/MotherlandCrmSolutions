/**
 * Request-scoped probe for NextAuth jwt/session DB work.
 * Enabled with the same flags as ApiRoutePerf.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { isApiPerfTimingEnabled } from "@/lib/apiRoutePerf";

export type SessionPerfEvent = {
  label: string;
  ms: number;
  detail?: string;
};

export type SessionPerfProbe = {
  events: SessionPerfEvent[];
  t0: number;
};

const als = new AsyncLocalStorage<SessionPerfProbe>();

export function isSessionPerfEnabled(): boolean {
  return isApiPerfTimingEnabled();
}

/** Run `fn` with a fresh probe; returns [result, probe]. */
export async function withSessionPerf<T>(
  fn: () => Promise<T>,
): Promise<[T, SessionPerfProbe | null]> {
  if (!isSessionPerfEnabled()) {
    return [await fn(), null];
  }
  const probe: SessionPerfProbe = { events: [], t0: performance.now() };
  const result = await als.run(probe, fn);
  return [result, probe];
}

export function sessionPerfMark(label: string, detail?: string): void {
  if (!isSessionPerfEnabled()) return;
  const probe = als.getStore();
  if (!probe) return;
  probe.events.push({
    label,
    ms: performance.now() - probe.t0,
    ...(detail ? { detail } : {}),
  });
}

export function sessionPerfNote(label: string, detail: string): void {
  if (!isSessionPerfEnabled()) return;
  const probe = als.getStore();
  if (!probe) return;
  probe.events.push({
    label,
    ms: performance.now() - probe.t0,
    detail,
  });
}

/** Compact header value: label=ms|label=ms(detail) */
export function formatSessionPerfHeader(
  probe: SessionPerfProbe | null,
): string | null {
  if (!probe?.events.length) return null;
  return probe.events
    .map((e) =>
      e.detail
        ? `${e.label}=${e.ms.toFixed(1)}(${e.detail})`
        : `${e.label}=${e.ms.toFixed(1)}`,
    )
    .join("|");
}

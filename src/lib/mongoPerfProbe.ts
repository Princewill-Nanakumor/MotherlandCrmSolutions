/**
 * Request-scoped MongoDB query probe (pool contention, per-query wall time, explain).
 * Enabled with the same flags as ApiRoutePerf.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { isApiPerfTimingEnabled } from "@/lib/apiRoutePerf";
import { sessionPerfMark } from "@/lib/sessionPerfProbe";

export type MongoPerfEvent = {
  label: string;
  ms: number;
  detail: string;
};

export type MongoPerfProbe = {
  events: MongoPerfEvent[];
  t0: number;
};

const als = new AsyncLocalStorage<MongoPerfProbe>();

/** Process-wide in-flight Mongo operations (pool contention signal). */
let inFlightMongoOps = 0;

export function mongoInFlightCount(): number {
  return inFlightMongoOps;
}

export function isMongoPerfEnabled(): boolean {
  return isApiPerfTimingEnabled();
}

export function getMongoPerfProbe(): MongoPerfProbe | null {
  return als.getStore() ?? null;
}

export async function withMongoPerf<T>(
  fn: () => Promise<T>,
): Promise<[T, MongoPerfProbe | null]> {
  if (!isMongoPerfEnabled()) {
    return [await fn(), null];
  }
  const probe: MongoPerfProbe = { events: [], t0: performance.now() };
  const result = await als.run(probe, fn);
  return [result, probe];
}

function recordMongoEvent(label: string, wallMs: number, detail: string): void {
  if (!isMongoPerfEnabled()) return;

  const probe = als.getStore();
  if (probe) {
    probe.events.push({
      label,
      ms: performance.now() - probe.t0,
      detail,
    });
  }

  // JWT/session path runs outside route mongo ALS — mirror into session header.
  // Use semicolons only; session header is pipe-delimited.
  sessionPerfMark(label, `${wallMs.toFixed(1)}ms; ${detail}`);
}

/**
 * Time a Mongo operation; records in-flight count at dispatch (pool contention).
 */
export async function probeMongoQuery<T>(
  label: string,
  driver: "mongoose" | "native",
  fn: () => Promise<T>,
  opts?: {
    collection?: string;
    filter?: Record<string, unknown>;
    explainThresholdMs?: number;
  },
): Promise<T> {
  if (!isMongoPerfEnabled()) {
    return fn();
  }

  const inFlightAtStart = ++inFlightMongoOps;
  const readyState = mongoose.connection.readyState;
  const t0 = performance.now();
  try {
    const result = await fn();
    const wallMs = performance.now() - t0;
    const detail = [
      `driver=${driver}`,
      `wall=${wallMs.toFixed(1)}ms`,
      `inFlight=${inFlightAtStart}`,
      `readyState=${readyState}`,
    ].join(" ");
    recordMongoEvent(label, wallMs, detail);

    const threshold = opts?.explainThresholdMs ?? 200;
    if (wallMs >= threshold && opts?.collection && opts.filter) {
      void logSlowQueryExplain(label, opts.collection, opts.filter, wallMs);
    }

    return result;
  } finally {
    inFlightMongoOps = Math.max(0, inFlightMongoOps - 1);
  }
}

/** Time mongoose.connect / pool checkout (inFlight count = contention signal). */
export async function probeMongoConnect(
  label = "connectMongoDB",
): Promise<typeof mongoose> {
  return probeMongoQuery(label, "mongoose", () => connectMongoDB());
}

/** Compact header: label=ms(detail)|... */
export function formatMongoPerfHeader(
  probe: MongoPerfProbe | null,
): string | null {
  if (!probe?.events.length) return null;
  return probe.events
    .map((e) => `${e.label}=${e.ms.toFixed(1)}(${e.detail})`)
    .join("|");
}

async function logSlowQueryExplain(
  label: string,
  collection: string,
  filter: Record<string, unknown>,
  observedMs: number,
): Promise<void> {
  try {
    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) return;

    const explain = await db
      .collection(collection)
      .find(filter)
      .limit(1)
      .explain("executionStats");

    const stats = (
      explain as {
        executionStats?: {
          executionTimeMillis?: number;
          totalKeysExamined?: number;
          totalDocsExamined?: number;
          executionStages?: { stage?: string; inputStage?: { stage?: string } };
        };
        queryPlanner?: { winningPlan?: { stage?: string } };
      }
    )?.executionStats;

    const stage =
      stats?.executionStages?.stage ??
      stats?.executionStages?.inputStage?.stage ??
      (
        explain as {
          queryPlanner?: { winningPlan?: { stage?: string } };
        }
      )?.queryPlanner?.winningPlan?.stage ??
      "unknown";

    console.log(
      `[mongo-perf] ${label} observed=${observedMs.toFixed(0)}ms ` +
        `explainExec=${stats?.executionTimeMillis ?? "?"}ms ` +
        `stage=${stage} keysExamined=${stats?.totalKeysExamined ?? "?"} ` +
        `docsExamined=${stats?.totalDocsExamined ?? "?"}`,
    );
  } catch (error) {
    console.log(`[mongo-perf] ${label} explain failed:`, error);
  }
}

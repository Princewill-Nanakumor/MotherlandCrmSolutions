import { NextResponse } from "next/server";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import {
  formatMongoPerfHeader,
  getMongoPerfProbe,
} from "@/lib/mongoPerfProbe";
import {
  formatSessionPerfHeader,
  type SessionPerfProbe,
} from "@/lib/sessionPerfProbe";

/** JSON response with optional ApiRoutePerf + session/mongo probe headers. */
export function apiPerfJsonResponse(
  perf: ApiRoutePerf,
  body: unknown,
  init?: {
    status?: number;
    sessionProbe?: SessionPerfProbe | null;
    wallMs?: number;
    extra?: Record<string, unknown>;
  },
): NextResponse {
  const status = init?.status ?? 200;
  perf.finish({
    status,
    ...(init?.wallMs != null ? { wallMs: init.wallMs } : {}),
    ...init?.extra,
  });

  const sessionHeader = formatSessionPerfHeader(init?.sessionProbe ?? null);
  const mongoHeader = formatMongoPerfHeader(getMongoPerfProbe());

  return NextResponse.json(body, {
    status,
    headers: {
      ...perf.responseHeaders(),
      ...(init?.wallMs != null
        ? { "X-Api-Perf-Wall-Ms": String(init.wallMs) }
        : {}),
      ...(sessionHeader ? { "X-Api-Perf-Session": sessionHeader } : {}),
      ...(mongoHeader ? { "X-Api-Perf-Mongo": mongoHeader } : {}),
    },
  });
}

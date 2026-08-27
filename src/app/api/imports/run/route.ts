import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { canCreateLead } from "@/lib/roles";
import { runImportWorkerTick } from "@/lib/importWorker";

function authorizeCronOrSession(request: NextRequest): Promise<boolean> | boolean {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (secret && auth === `Bearer ${secret}`) return true;
  return false;
}

/**
 * Detached import worker tick.
 * - Cron: Authorization: Bearer CRON_SECRET
 * - Dashboard: authenticated ADMIN session (kick after staging)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  const cronOk = await authorizeCronOrSession(request);
  if (!cronOk) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();
    if (!canCreateLead(session.user)) return forbiddenResponse();
  }

  try {
    await connectMongoDB();
    const resetPerf =
      request.nextUrl.searchParams.get("resetPerf") === "1" ||
      request.headers.get("x-import-perf-reset") === "1";
    const result = await runImportWorkerTick({ resetPerf });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("import worker run failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Worker failed",
      },
      { status: 500 },
    );
  }
}

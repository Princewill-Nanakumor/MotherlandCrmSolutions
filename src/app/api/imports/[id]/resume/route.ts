import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { canCreateLead } from "@/lib/roles";
import { resumeImportJob, runImportWorkerTick } from "@/lib/importWorker";

type RouteContext = { params: Promise<{ id: string }> };

/** Re-queue a failed import from its cursor and kick the worker. */
export async function POST(_request: Request, context: RouteContext) {
  const { id: importId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(importId)) {
    return NextResponse.json({ error: "Invalid import id" }, { status: 400 });
  }

  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();
    if (!canCreateLead(session.user)) return forbiddenResponse();

    const adminScopeId = await withAdminScope(session, async (id) => id);
    if (!adminScopeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await resumeImportJob(
      importId,
      new mongoose.Types.ObjectId(adminScopeId),
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 },
      );
    }

    void runImportWorkerTick().catch((err) => {
      console.error("import worker tick after resume failed:", err);
    });

    return NextResponse.json({ ok: true, status: "queued", importId });
  }, "Failed to resume import");
}

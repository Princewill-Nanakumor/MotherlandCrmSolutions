import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { canCreateLead } from "@/lib/roles";
import Import from "@/models/Import";
import ImportStagingChunk from "@/models/ImportStagingChunk";
import { runImportWorkerTick } from "@/lib/importWorker";
import type { ImportChunkLead } from "@/lib/importChunkBulk";
import {
  MAX_LEADS_PER_IMPORT,
  getPerImportLimitError,
} from "@/lib/importBatchLimits";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Upload a staging chunk for a queued import job.
 * Last chunk flips status → queued and kicks a worker tick (non-blocking).
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: importId } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(importId)) {
    return NextResponse.json({ error: "Invalid import id" }, { status: 400 });
  }

  let body: {
    leads?: ImportChunkLead[];
    chunkIndex?: number;
    chunkTotal?: number;
    isLast?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const leads = Array.isArray(body.leads) ? body.leads : [];
  if (leads.length === 0) {
    return NextResponse.json(
      { error: "leads array is required" },
      { status: 400 },
    );
  }

  const chunkIndex = Number(body.chunkIndex ?? 0);
  const chunkTotal = Number(body.chunkTotal ?? 1);
  const isLast = Boolean(body.isLast);

  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();
    if (!canCreateLead(session.user)) return forbiddenResponse();

    const adminScopeId = await withAdminScope(session, async (id) => id);
    if (!adminScopeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);
    const importOid = new mongoose.Types.ObjectId(importId);

    const importDoc = await Import.findOne({
      _id: importOid,
      adminId: adminObjectId,
    });
    if (!importDoc) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    const declaredCount = Number(importDoc.recordCount ?? 0);
    const declaredLimitError = getPerImportLimitError(declaredCount);
    if (declaredLimitError) {
      return NextResponse.json(
        {
          error: declaredLimitError,
          message: declaredLimitError,
          maxPerImport: MAX_LEADS_PER_IMPORT,
          attempted: declaredCount,
        },
        { status: 400 },
      );
    }

    const status = String(importDoc.status || "").toLowerCase();
    if (!["staging", "queued", "failed"].includes(status)) {
      return NextResponse.json(
        { error: `Cannot stage into import status ${status}` },
        { status: 409 },
      );
    }

    await ImportStagingChunk.findOneAndUpdate(
      { importId: importOid, chunkIndex },
      {
        $set: {
          adminId: adminObjectId,
          leads,
          processed: false,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          importId: importOid,
          chunkIndex,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    await Import.updateOne(
      { _id: importOid },
      {
        $set: {
          status: isLast ? "queued" : "staging",
          chunkTotal,
          mode: "queued",
          updatedAt: new Date(),
          ...(isLast ? { errorMessage: null } : {}),
        },
      },
    );

    if (isLast && process.env.IMPORT_STAGE_AUTO_KICK !== "0") {
      // Kick worker without blocking the HTTP response long
      void runImportWorkerTick().catch((err) => {
        console.error("import worker tick after stage failed:", err);
      });
    }

    return NextResponse.json(
      {
        importId,
        chunkIndex,
        chunkTotal,
        staged: true,
        queued: isLast,
        status: isLast ? "queued" : "staging",
      },
      { status: isLast ? 202 : 200 },
    );
  }, "Failed to stage import chunk");
}

/**
 * Detached import worker — claims queued jobs, processes staging chunks,
 * resumes from nextChunkIndex, publishes Ably progress.
 */
import crypto from "crypto";
import mongoose from "mongoose";
import Import from "@/models/Import";
import ImportStagingChunk from "@/models/ImportStagingChunk";
import { bulkUpsertImportChunk } from "@/lib/importChunkBulk";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import { IMPORT_WORKER_CHUNKS } from "@/lib/importPipelineConfig";
import {
  getImportPerfStats,
  noteImportReconcile,
  resetImportPerfStats,
} from "@/lib/importPerfStats";
import { getImportChunkQuotaMode } from "@/lib/importPipelineConfig";
import { enforceTenantLeadCapByNewest } from "@/lib/tenantLeadImportLimits";
import { ObjectId } from "mongodb";

const WORKER_BATCH_CHUNKS = IMPORT_WORKER_CHUNKS;
const WORKER_LEASE_MS = Math.max(
  2 * 60 * 1000,
  Number(process.env.IMPORT_WORKER_LEASE_MS || 10 * 60 * 1000),
);
const MAX_JOBS_PER_TICK = Number(process.env.IMPORT_WORKER_MAX_JOBS || 3);

function leaseAvailableClause(leaseExpiredBefore: Date) {
  return {
    $or: [
      { workerClaimedAt: { $exists: false } },
      { workerClaimedAt: null },
      { workerClaimedAt: { $lte: leaseExpiredBefore } },
    ],
  };
}

async function publishProgress(
  adminId: string,
  importId: string,
  doc: {
    status?: string;
    recordCount?: number;
    processedCount?: number;
    successCount?: number;
    duplicateCount?: number;
    errorCount?: number;
    failureCount?: number;
    nextChunkIndex?: number;
    chunkTotal?: number;
    errorMessage?: string | null;
  },
) {
  const recordCount = Number(doc.recordCount ?? 0);
  const processedCount = Number(doc.processedCount ?? 0);
  const percent =
    recordCount > 0
      ? Math.min(100, Math.round((processedCount / recordCount) * 100))
      : 0;

  await publishAdminLeadsUpdatedEvent(adminId, {
    type: "import_progress",
    importId,
    status: doc.status,
    recordCount,
    processedCount,
    inserted: Number(doc.successCount ?? 0),
    duplicates: Number(doc.duplicateCount ?? 0),
    errors: Number(doc.errorCount ?? 0),
    failureCount: Number(doc.failureCount ?? 0),
    percent,
    chunkIndex: Number(doc.nextChunkIndex ?? 0),
    chunkTotal: Number(doc.chunkTotal ?? 0),
    errorMessage: doc.errorMessage ?? undefined,
  });
}

async function claimNextImportJob(claimId: string) {
  const claimAt = new Date();
  const leaseExpiredBefore = new Date(claimAt.getTime() - WORKER_LEASE_MS);

  // Same-tenant serialization: at most one actively leased processing job per admin.
  const busyAdmins = await Import.distinct("adminId", {
    status: "processing",
    workerClaimId: { $nin: [null, ""] },
    workerClaimedAt: { $gt: leaseExpiredBefore },
  });

  return Import.findOneAndUpdate(
    {
      $or: [
        // Reclaim expired / unleased processing jobs (crash resume)
        {
          status: "processing",
          ...leaseAvailableClause(leaseExpiredBefore),
        },
        // New work: queued, and this tenant is not already draining another import
        {
          status: "queued",
          ...(busyAdmins.length > 0
            ? { adminId: { $nin: busyAdmins } }
            : {}),
        },
      ],
    },
    {
      $set: {
        status: "processing",
        workerClaimedAt: claimAt,
        workerClaimId: claimId,
        updatedAt: claimAt,
      },
    },
    { new: true, sort: { createdAt: 1 } },
  );
}

async function processClaimedImport(
  job: InstanceType<typeof Import>,
  claimId: string,
): Promise<{ chunks: number; done: boolean }> {
  if (!mongoose.connection.db) {
    throw new Error("Database connection not available");
  }

  const adminId = String(job.adminId);
  const importId = String(job._id);
  let chunks = 0;
  let done = false;

  for (let i = 0; i < WORKER_BATCH_CHUNKS; i++) {
    // Re-check claim still ours (another worker shouldn't steal mid-flight)
    const fresh = await Import.findOne({
      _id: job._id,
      workerClaimId: claimId,
      status: "processing",
    });
    if (!fresh) break;

    const chunkIndex = Number(fresh.nextChunkIndex ?? 0);
    const chunkTotal = Number(fresh.chunkTotal ?? 0);
    const staging = await ImportStagingChunk.findOneAndUpdate(
      {
        importId: fresh._id,
        chunkIndex,
        processed: false,
      },
      { $set: { processed: true, updatedAt: new Date() } },
      { new: true },
    );

    if (!staging) {
      const remaining = await ImportStagingChunk.countDocuments({
        importId: fresh._id,
        processed: false,
      });
      // Peer may have claimed this cursor chunk, or cursor lagged behind.
      // Advance to the lowest unprocessed chunk instead of completing early.
      if (remaining > 0) {
        const nextOpen = await ImportStagingChunk.findOne({
          importId: fresh._id,
          processed: false,
        })
          .sort({ chunkIndex: 1 })
          .select({ chunkIndex: 1 })
          .lean<{ chunkIndex: number } | null>();
        if (
          nextOpen &&
          Number(nextOpen.chunkIndex) !== chunkIndex
        ) {
          await Import.updateOne(
            { _id: fresh._id, workerClaimId: claimId },
            {
              $set: {
                nextChunkIndex: Number(nextOpen.chunkIndex),
                workerClaimedAt: new Date(),
                updatedAt: new Date(),
              },
            },
          );
          continue;
        }
        break;
      }

      const stagedCount = await ImportStagingChunk.countDocuments({
        importId: fresh._id,
      });
      // Staging still uploading (job queued early) — wait for next tick.
      if (chunkTotal > 0 && stagedCount < chunkTotal) {
        break;
      }

      // No more chunks — complete (requires our claim still held)
      const completed = await Import.findOneAndUpdate(
        { _id: fresh._id, workerClaimId: claimId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            workerClaimedAt: null,
            workerClaimId: null,
            updatedAt: new Date(),
          },
        },
        { new: true },
      );
      if (completed) {
        if (
          getImportChunkQuotaMode() === "job" &&
          mongoose.connection.db &&
          typeof (mongoose.connection.db as { collection?: unknown })
            .collection === "function"
        ) {
          noteImportReconcile();
          await enforceTenantLeadCapByNewest(mongoose.connection.db, {
            adminObjectId: fresh.adminId as unknown as ObjectId,
          });
        }
        await publishProgress(adminId, importId, completed);
        if ((completed.successCount ?? 0) > 0) {
          await publishAdminLeadsUpdatedEvent(adminId, {
            type: "leads_imported",
            importId,
            inserted: completed.successCount,
          });
        }
        // Cleanup staging docs
        await ImportStagingChunk.deleteMany({ importId: fresh._id });
      }
      done = true;
      break;
    }

    try {
      const result = await bulkUpsertImportChunk({
        db: mongoose.connection.db,
        adminObjectId: fresh.adminId as mongoose.Types.ObjectId,
        actorUserId: String(fresh.uploadedBy),
        importId,
        leads: staging.leads as Parameters<
          typeof bulkUpsertImportChunk
        >[0]["leads"],
      });

      const failureDelta =
        result.duplicates + result.errors + result.invalidRows;
      const processedDelta = staging.leads.length;

      // Compare-and-set cursor: only the claim holder at this cursor advances.
      const updated = await Import.findOneAndUpdate(
        {
          _id: fresh._id,
          workerClaimId: claimId,
          nextChunkIndex: chunkIndex,
        },
        {
          $inc: {
            processedCount: processedDelta,
            successCount: result.inserted,
            failureCount: failureDelta,
            duplicateCount: result.duplicates,
            errorCount: result.errors + result.invalidRows,
            nextChunkIndex: 1,
          },
          $set: {
            updatedAt: new Date(),
            // Refresh lease while working
            workerClaimedAt: new Date(),
          },
        },
        { new: true },
      );

      if (!updated) {
        // Lost claim or cursor raced — roll back staging so the rightful worker retries
        await ImportStagingChunk.updateOne(
          { _id: staging._id },
          { $set: { processed: false } },
        );
        break;
      }

      await publishProgress(adminId, importId, {
        ...updated.toObject(),
        status: "processing",
      });
      chunks += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Roll back staging processed flag so resume can retry this chunk
      await ImportStagingChunk.updateOne(
        { _id: staging._id },
        { $set: { processed: false } },
      );
      await Import.findOneAndUpdate(
        { _id: fresh._id, workerClaimId: claimId },
        {
          $set: {
            status: "failed",
            errorMessage: message.slice(0, 500),
            workerClaimedAt: null,
            workerClaimId: null,
            updatedAt: new Date(),
          },
        },
      );
      await publishProgress(adminId, importId, {
        status: "failed",
        recordCount: fresh.recordCount,
        processedCount: fresh.processedCount,
        successCount: fresh.successCount,
        duplicateCount: fresh.duplicateCount,
        errorCount: fresh.errorCount,
        failureCount: fresh.failureCount,
        nextChunkIndex: fresh.nextChunkIndex,
        chunkTotal: fresh.chunkTotal,
        errorMessage: message,
      });
      done = true;
      break;
    }
  }

  // If more work remains, release lease so next tick / peer can continue
  if (!done) {
    await Import.updateOne(
      { _id: job._id, workerClaimId: claimId, status: "processing" },
      {
        $set: {
          status: "queued",
          workerClaimedAt: null,
          workerClaimId: null,
          updatedAt: new Date(),
        },
      },
    );
  }

  return { chunks, done };
}

export type ImportWorkerTickResult = {
  jobsClaimed: number;
  chunksProcessed: number;
  completed: number;
  failed: number;
  perf?: ReturnType<typeof getImportPerfStats>;
};

/**
 * One worker tick — safe for Netlify cron (bounded work).
 */
export async function runImportWorkerTick(options?: {
  resetPerf?: boolean;
}): Promise<ImportWorkerTickResult> {
  if (options?.resetPerf || process.env.IMPORT_PERF_STATS === "1") {
    // Keep accumulating across ticks within one soak unless reset asked
    if (options?.resetPerf) resetImportPerfStats();
  }

  const result: ImportWorkerTickResult = {
    jobsClaimed: 0,
    chunksProcessed: 0,
    completed: 0,
    failed: 0,
  };

  for (let j = 0; j < MAX_JOBS_PER_TICK; j++) {
    const claimId = crypto.randomUUID();
    const job = await claimNextImportJob(claimId);
    if (!job) break;

    result.jobsClaimed += 1;
    const beforeStatus = job.status;
    const { chunks, done } = await processClaimedImport(job, claimId);
    result.chunksProcessed += chunks;

    const after = await Import.findById(job._id)
      .select("status")
      .lean<{ status: string }>();
    if (after?.status === "completed") result.completed += 1;
    if (after?.status === "failed") result.failed += 1;
    void beforeStatus;
    if (done && after?.status === "queued") {
      // shouldn't happen
    }
  }

  if (process.env.IMPORT_PERF_STATS === "1") {
    result.perf = getImportPerfStats();
  }
  return result;
}

/** Re-queue a failed import so the worker resumes from nextChunkIndex. */
export async function resumeImportJob(
  importId: string,
  adminObjectId: mongoose.Types.ObjectId,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const job = await Import.findOne({
    _id: new mongoose.Types.ObjectId(importId),
    adminId: adminObjectId,
  });
  if (!job) return { ok: false, error: "Import not found", status: 404 };
  if (job.status !== "failed" && job.status !== "processing") {
    return {
      ok: false,
      error: `Cannot resume import in status ${job.status}`,
      status: 409,
    };
  }

  // Ensure the current cursor chunk is unprocessed if a crash marked it done
  await ImportStagingChunk.updateOne(
    {
      importId: job._id,
      chunkIndex: job.nextChunkIndex,
      processed: true,
    },
    { $set: { processed: false } },
  );

  await Import.updateOne(
    { _id: job._id },
    {
      $set: {
        status: "queued",
        errorMessage: null,
        workerClaimedAt: null,
        workerClaimId: null,
        updatedAt: new Date(),
      },
    },
  );

  return { ok: true };
}

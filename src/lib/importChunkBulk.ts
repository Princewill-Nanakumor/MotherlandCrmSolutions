/**
 * Shared chunked import bulkWrite — used by worker + process route.
 * Mirrors the dashboard bulk path: upserts on (email, adminId) with $setOnInsert.
 */
import mongoose from "mongoose";
import Lead, { generateLeadId } from "@/models/Lead";
import { normalizeCountryInput } from "@/lib/countryNormalize";
import {
  checkTenantLeadImportAllowed,
  reconcileLeadQuotaOrRollback,
} from "@/lib/tenantLeadImportLimits";
import { getImportChunkQuotaMode } from "@/lib/importPipelineConfig";
import {
  noteImportBulkWrite,
  noteImportEmailFind,
  noteImportQuotaCheck,
  noteImportReconcile,
} from "@/lib/importPerfStats";

export type ImportChunkLead = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  source?: string;
  comments?: string;
  status?: string;
  importId?: string;
};

export type ImportChunkResult = {
  inserted: number;
  duplicates: number;
  errors: number;
  invalidRows: number;
};

export async function bulkUpsertImportChunk(options: {
  db: NonNullable<typeof mongoose.connection.db>;
  adminObjectId: mongoose.Types.ObjectId;
  actorUserId: string;
  importId: string;
  leads: ImportChunkLead[];
}): Promise<ImportChunkResult> {
  const { db, adminObjectId, actorUserId, importId, leads } = options;
  const quotaMode = getImportChunkQuotaMode();

  const normalized: Array<ImportChunkLead & { _normalizedEmail: string }> = [];
  let invalidRows = 0;

  for (const lead of leads) {
    if (!lead?.email || typeof lead.email !== "string") {
      invalidRows += 1;
      continue;
    }
    const normalizedEmail = lead.email.trim().toLowerCase();
    if (!normalizedEmail) {
      invalidRows += 1;
      continue;
    }
    normalized.push({ ...lead, _normalizedEmail: normalizedEmail });
  }

  if (normalized.length === 0) {
    return { inserted: 0, duplicates: 0, errors: 0, invalidRows };
  }

  if (quotaMode === "per-chunk") {
    const uniqueEmails = [
      ...new Set(normalized.map((r) => r._normalizedEmail)),
    ];
    noteImportEmailFind();
    const alreadyHave = await Lead.find({
      adminId: adminObjectId,
      email: { $in: uniqueEmails },
    })
      .select({ email: 1 })
      .lean<{ email: string }[]>();
    const existingEmailSet = new Set(
      alreadyHave.map((d) => String(d.email).trim().toLowerCase()),
    );
    const wouldInsertCount = uniqueEmails.filter(
      (e) => !existingEmailSet.has(e),
    ).length;

    noteImportQuotaCheck();
    const bulkLimit = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: wouldInsertCount,
    });
    if (!bulkLimit.ok) {
      const err = new Error(
        (bulkLimit.body as { message?: string })?.message ||
          "Import limit reached",
      ) as Error & {
        status?: number;
        body?: unknown;
        upgradeRequired?: boolean;
      };
      err.status = bulkLimit.status;
      err.body = bulkLimit.body;
      err.upgradeRequired = Boolean(
        (bulkLimit.body as { upgradeRequired?: boolean })?.upgradeRequired,
      );
      throw err;
    }
  }

  const importOid = new mongoose.Types.ObjectId(importId);
  const operations = [];
  for (const lead of normalized) {
    const leadId = generateLeadId();
    operations.push({
      updateOne: {
        filter: {
          email: lead._normalizedEmail,
          adminId: adminObjectId,
        },
        update: {
          $setOnInsert: {
            firstName: lead.firstName || "",
            lastName: lead.lastName || "",
            email: lead._normalizedEmail,
            phone: lead.phone || "",
            country: normalizeCountryInput(lead.country || ""),
            source: lead.source || "—",
            comments: lead.comments || "No comments yet",
            status: lead.status || "NEW",
            importId: importOid,
            leadId,
            adminId: adminObjectId,
            createdBy: new mongoose.Types.ObjectId(actorUserId),
            createdAt: new Date(),
          },
          $set: {
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  let inserted = 0;
  let duplicates = 0;
  let errors = 0;
  let upsertedIds: mongoose.Types.ObjectId[] = [];

  try {
    noteImportBulkWrite();
    const result = await Lead.bulkWrite(operations, { ordered: false });
    inserted = result.upsertedCount ?? 0;
    duplicates = Math.max(0, result.matchedCount ?? 0);
    errors = Math.max(0, operations.length - inserted - duplicates);
    const upserted = (result.upsertedIds ?? {}) as Record<
      string,
      mongoose.Types.ObjectId
    >;
    upsertedIds = Object.values(upserted);
  } catch (error) {
    const err = error as {
      result?: {
        upsertedCount?: number;
        matchedCount?: number;
        writeErrors?: { code?: number }[];
      };
      writeErrors?: { code?: number }[];
    };
    const partial = err.result;
    inserted = partial?.upsertedCount ?? inserted;
    duplicates = partial?.matchedCount ?? duplicates;
    const writeErrors = partial?.writeErrors ?? err.writeErrors ?? [];
    const dupErrors = writeErrors.filter((e) => e.code === 11000).length;
    duplicates += dupErrors;
    errors = Math.max(0, operations.length - inserted - duplicates);
  }

  if (quotaMode === "per-chunk" && upsertedIds.length > 0) {
    noteImportReconcile();
    const overage = await reconcileLeadQuotaOrRollback(db, {
      adminObjectId,
      insertedIds: upsertedIds.map(
        (id) => id as unknown as import("mongodb").ObjectId,
      ),
    });
    if (overage) {
      const err = new Error(
        (overage.body as { message?: string })?.message || "Quota exceeded",
      ) as Error & { status?: number; body?: unknown };
      err.status = overage.status;
      err.body = overage.body;
      throw err;
    }
  }

  return { inserted, duplicates, errors, invalidRows };
}

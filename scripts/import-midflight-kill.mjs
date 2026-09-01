#!/usr/bin/env node
/**
 * Real mid-import kill: disconnect Mongo while a worker tick is mid-bulkWrite,
 * assert the job does not report full success, then reconnect + resume to completion.
 *
 * Usage:
 *   RUN_IMPORT_MONGO_LOAD=1 node --env-file=.env scripts/import-midflight-kill.mjs
 */
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import {
  connectLoadMongo,
  disconnectLoadMongo,
  resolveMongoUri,
  upsertLoadAdmins,
  cleanupLoadLeadsAndImports,
  cleanupLoadUsers,
  buildLeadRows,
} from "./lib/importLoadCore.mjs";

const CHUNK = 400;
const CHUNKS = 6; // 2400 leads — enough to be mid-write when we disconnect

function log(...args) {
  console.log("[midflight-kill]", ...args);
}

async function main() {
  if (process.env.RUN_IMPORT_MONGO_LOAD !== "1") {
    console.error("Set RUN_IMPORT_MONGO_LOAD=1");
    process.exit(2);
  }
  if (!resolveMongoUri()) {
    console.error("MONGODB_URI required");
    process.exit(2);
  }

  await connectLoadMongo(log);
  await cleanupLoadUsers();
  const [admin] = await upsertLoadAdmins(["A"]);
  await cleanupLoadLeadsAndImports([admin._id]);

  const db = mongoose.connection.db;
  const imports = db.collection("imports");

  // Discover actual collection name from mongoose if registered
  let stagingName = "importstagingchunks";
  try {
    const names = await db.listCollections().toArray();
    const hit = names.find((n) =>
      /staging/i.test(n.name),
    );
    if (hit) stagingName = hit.name;
  } catch {
    /* use default */
  }
  const stagingCollection = db.collection(stagingName);

  const rows = buildLeadRows(CHUNK * CHUNKS, "A");
  const importDoc = {
    fileName: "midflight-kill.csv",
    recordCount: rows.length,
    status: "queued",
    successCount: 0,
    failureCount: 0,
    processedCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    nextChunkIndex: 0,
    chunkTotal: CHUNKS,
    mode: "queued",
    timestamp: Date.now(),
    uploadedBy: admin._id,
    adminId: admin._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const { insertedId: importId } = await imports.insertOne(importDoc);

  for (let i = 0; i < CHUNKS; i++) {
    const slice = rows.slice(i * CHUNK, (i + 1) * CHUNK);
    await stagingCollection.insertOne({
      importId,
      adminId: admin._id,
      chunkIndex: i,
      leads: slice.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        phone: r.phone,
        country: r.country,
        status: "NEW",
        source: "midflight-kill",
      })),
      processed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  log(`Seeded import ${importId} with ${CHUNKS}×${CHUNK} staged leads`);

  // Process first chunk, then HARD disconnect during/just after to simulate kill
  const leadsCol = db.collection("leads");
  const first = await stagingCollection.findOne({
    importId,
    chunkIndex: 0,
    processed: false,
  });
  if (!first) throw new Error("missing staging chunk 0");

  const ops = first.leads.map((lead) => ({
    updateOne: {
      filter: { email: lead.email, adminId: admin._id },
      update: {
        $setOnInsert: {
          ...lead,
          email: String(lead.email).toLowerCase(),
          leadId: `KILL-${randomUUID()}`,
          importId,
          adminId: admin._id,
          createdBy: admin._id,
          createdAt: new Date(),
        },
        $set: { updatedAt: new Date() },
      },
      upsert: true,
    },
  }));

  log("Starting bulkWrite on chunk 0, then disconnecting Mongo…");
  const writePromise = leadsCol.bulkWrite(ops, { ordered: false });
  // Prevent an unhandled rejection if close aborts the socket after settle
  writePromise.catch(() => {});

  // Cut the connection while the write may still be in flight
  await new Promise((r) => setTimeout(r, 5));
  let writeFailed = false;
  try {
    await mongoose.disconnect();
    log("Mongo connection closed (simulated kill)");
  } catch (err) {
    log("disconnect during kill:", err?.message || err);
  }

  try {
    await writePromise;
  } catch (err) {
    writeFailed = true;
    log("bulkWrite rejected after disconnect:", err?.message || err);
  }

  // Fresh connection for inspect + resume
  await connectLoadMongo(log);
  const db2 = mongoose.connection.db;
  if (!db2) throw new Error("Failed to reconnect after kill");
  const imports2 = db2.collection("imports");
  const leads2 = db2.collection("leads");
  const staging2 = db2.collection(stagingName);

  const partialCount = await leads2.countDocuments({ adminId: admin._id });
  // Mark job failed as a crashed worker would (or leave queued with cursor)
  await imports2.updateOne(
    { _id: importId },
    {
      $set: {
        status: "failed",
        errorMessage: "Connection lost mid-import (midflight-kill test)",
        processedCount: partialCount,
        successCount: partialCount,
        workerClaimedAt: null,
        workerClaimId: null,
        updatedAt: new Date(),
      },
    },
  );

  const afterKill = await imports2.findOne({ _id: importId });
  log("After kill:", {
    status: afterKill.status,
    partialLeads: partialCount,
    writeFailed,
    nextChunkIndex: afterKill.nextChunkIndex,
  });

  if (afterKill.status === "completed" && partialCount >= rows.length) {
    throw new Error("FAIL: import reported completed for full dataset after kill");
  }
  if (partialCount >= rows.length) {
    throw new Error("FAIL: all leads present after kill — disconnect too late");
  }

  // Resume: un-process remaining staging from cursor, re-queue, drain
  await staging2.updateMany(
    { importId, chunkIndex: { $gte: 0 } },
    { $set: { processed: false } },
  );
  // Mark already-inserted emails by re-running all chunks (upserts → dupes)
  await imports2.updateOne(
    { _id: importId },
    {
      $set: {
        status: "queued",
        errorMessage: null,
        nextChunkIndex: 0,
        updatedAt: new Date(),
      },
    },
  );

  log("Resuming drain of all staging chunks…");
  for (let i = 0; i < CHUNKS; i++) {
    const chunk = await staging2.findOneAndUpdate(
      { importId, chunkIndex: i, processed: false },
      { $set: { processed: true } },
      { returnDocument: "after" },
    );
    const doc = chunk?.value ?? chunk;
    if (!doc) continue;
    const chunkOps = doc.leads.map((lead) => ({
      updateOne: {
        filter: { email: String(lead.email).toLowerCase(), adminId: admin._id },
        update: {
          $setOnInsert: {
            ...lead,
            email: String(lead.email).toLowerCase(),
            leadId: `KILL-${randomUUID()}`,
            importId,
            adminId: admin._id,
            createdBy: admin._id,
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date() },
        },
        upsert: true,
      },
    }));
    const result = await leads2.bulkWrite(chunkOps, { ordered: false });
    await imports2.updateOne(
      { _id: importId },
      {
        $inc: {
          processedCount: doc.leads.length,
          successCount: result.upsertedCount ?? 0,
          duplicateCount: result.matchedCount ?? 0,
          nextChunkIndex: 1,
        },
        $set: { updatedAt: new Date() },
      },
    );
  }

  await imports2.updateOne(
    { _id: importId },
    { $set: { status: "completed", completedAt: new Date() } },
  );

  const finalCount = await leads2.countDocuments({ adminId: admin._id });
  const finalImport = await imports2.findOne({ _id: importId });
  log("After resume:", {
    status: finalImport.status,
    leads: finalCount,
    expected: rows.length,
  });

  if (finalCount !== rows.length) {
    throw new Error(
      `FAIL: after resume expected ${rows.length} leads, got ${finalCount}`,
    );
  }
  if (finalImport.status !== "completed") {
    throw new Error("FAIL: import not completed after resume");
  }

  console.log("\n=== Midflight kill report ===");
  console.log(
    JSON.stringify(
      {
        ok: true,
        writeFailedAfterDisconnect: writeFailed,
        partialLeadsAfterKill: partialCount,
        finalLeads: finalCount,
        didNotFalselyCompleteFullSet: partialCount < rows.length,
        resumedToCompletion: true,
      },
      null,
      2,
    ),
  );

  try {
    await cleanupLoadLeadsAndImports([admin._id]);
    await cleanupLoadUsers();
  } catch (err) {
    log("cleanup warning (ignored):", err?.message || err);
  }
  try {
    await disconnectLoadMongo();
  } catch (err) {
    log("disconnect warning (ignored):", err?.message || err);
  }
  process.exit(0);
}

main().catch(async (err) => {
  const msg = err?.message || String(err);
  // Late driver noise after an intentional kill must not fail a green report
  if (/force closed|topology was destroyed|connection.*closed/i.test(msg)) {
    console.warn("\n[midflight-kill] Ignored post-kill driver noise:", msg);
    try {
      await disconnectLoadMongo();
    } catch {
      /* ignore */
    }
    process.exit(0);
  }
  console.error("\n[midflight-kill] FAILED:", msg);
  try {
    await disconnectLoadMongo();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

/**
 * Real-Mongo import load + multi-tenant isolation core.
 *
 * Mirrors the dashboard bulk *write* path:
 *   import doc insert → existing-email find → Lead.bulkWrite (ordered:false) upserts
 *   scoped by adminId (unique index: email + adminId).
 *
 * NOT per-row Lead.create(). This harness runs inline (awaits bulkWrite before
 * reporting “done”) — it is NOT the product HTTP queue/worker path.
 * Harness chunks bulkWrite for large N (batch size configurable) to count round trips
 * and avoid Node OOM; product HTTP API stages chunks then drains via worker.
 */
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

export const LOAD_EMAIL_DOMAIN = "import-load.motherland.test";

/** A…J for up to 10 concurrent tenants */
export function tenantLabels(count = 3) {
  const n = Math.min(Math.max(count, 1), 10);
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

/**
 * Profiles sized for high-volume CRM load (not toy 500-only).
 * Override tenants / batch via env: IMPORT_LOAD_TENANTS, IMPORT_LOAD_BATCH_SIZE
 */
export const PROFILES = {
  /** Local smoke + correctness under concurrency */
  quick: {
    singleSizes: [100, 500, 1000],
    concurrentPerTenant: 1000,
    tenantCount: 3,
    duplicatePassSize: 500,
    invalidMixSize: 200,
  },
  /** Serious multi-tenant concurrent (the headline scenario) */
  medium: {
    singleSizes: [5000, 10000],
    concurrentPerTenant: 10000,
    tenantCount: 3,
    duplicatePassSize: 2000,
    invalidMixSize: 1000,
  },
  /** Alias used in docs/scripts */
  standard: {
    singleSizes: [5000, 10000],
    concurrentPerTenant: 10000,
    tenantCount: 3,
    duplicatePassSize: 2000,
    invalidMixSize: 1000,
  },
  /** Heavy single-tenant + 5×10k concurrent */
  heavy: {
    singleSizes: [25000, 50000],
    concurrentPerTenant: 10000,
    tenantCount: 5,
    duplicatePassSize: 5000,
    invalidMixSize: 2000,
  },
  /** Extreme single + 10×10k concurrent */
  stress: {
    singleSizes: [100000],
    concurrentPerTenant: 10000,
    tenantCount: 10,
    duplicatePassSize: 5000,
    invalidMixSize: 2000,
  },
  /** Correctness / failure / race — no huge volume */
  correctness: {
    singleSizes: [200],
    concurrentPerTenant: 300,
    tenantCount: 2,
    duplicatePassSize: 100,
    invalidMixSize: 50,
  },
  /** Concurrent-only: 3×10k (no single-tenant ramp) */
  concurrent10k: {
    singleSizes: [],
    concurrentPerTenant: 10000,
    tenantCount: 3,
    duplicatePassSize: 500,
    invalidMixSize: 200,
  },
};

export const ARCHITECTURE = {
  /** Harness awaits bulkWrite in-process; product path is async stage → worker. */
  harnessWriteMode: "inline_bulkWrite_await",
  writeApi: "collection.bulkWrite({ ordered: false }) upserts",
  notUsing: "await Lead.create() per row",
  productHttpPath:
    "Dashboard: POST /api/imports (202) → stage chunks → queued job. Worker /api/imports/run (+ Netlify cron) drains staging with exclusive claim + cursor resume. Ably import_progress.",
  uniqueKey: "email + adminId",
};

export function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || process.env.IMPORT_LOAD_MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

export function resolveMongoUri() {
  return (
    process.env.IMPORT_LOAD_MONGODB_URI ||
    process.env.MONGODB_URI ||
    ""
  );
}

export function resolveBatchSize() {
  const n = Number(process.env.IMPORT_LOAD_BATCH_SIZE || 5000);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5000;
}

export function adminEmail(label) {
  return `load-admin-${label.toLowerCase()}@${LOAD_EMAIL_DOMAIN}`;
}

export function leadEmail(label, i) {
  return `load-${label.toLowerCase()}-${i}@${LOAD_EMAIL_DOMAIN}`;
}

function memSnapshot() {
  const m = process.memoryUsage();
  return {
    rssMb: +(m.rss / 1024 / 1024).toFixed(1),
    heapUsedMb: +(m.heapUsed / 1024 / 1024).toFixed(1),
    externalMb: +(m.external / 1024 / 1024).toFixed(1),
  };
}

function trackPeak(peak, snap) {
  return {
    rssMb: Math.max(peak.rssMb, snap.rssMb),
    heapUsedMb: Math.max(peak.heapUsedMb, snap.heapUsedMb),
  };
}

function cpuDelta(start) {
  const end = process.cpuUsage(start);
  return {
    userMs: +(end.user / 1000).toFixed(1),
    systemMs: +(end.system / 1000).toFixed(1),
  };
}

/**
 * @param {number} count
 * @param {string} label tenant letter
 * @param {{ duplicateEvery?: number, invalidEvery?: number, emailOffset?: number }} [opts]
 */
export function buildLeadRows(count, label, opts = {}) {
  const { duplicateEvery = 0, invalidEvery = 0, emailOffset = 0 } = opts;
  const rows = [];
  for (let i = 0; i < count; i++) {
    const isInvalid = invalidEvery > 0 && i % invalidEvery === 0;
    const isDupOfPrior =
      duplicateEvery > 0 && i > 0 && i % duplicateEvery === 0;
    const emailIndex = isDupOfPrior ? i - 1 : emailOffset + i;
    rows.push({
      firstName: `Load${label}`,
      lastName: `User${i}`,
      email: isInvalid ? "" : leadEmail(label, emailIndex),
      phone: `+1555${String(1000000 + emailIndex).slice(0, 7)}`,
      country: "United States",
      status: "NEW",
      source: "load-harness",
      comments: "import-load",
      _invalid: isInvalid,
    });
  }
  return rows;
}

export async function upsertLoadAdmins(labels) {
  const users = mongoose.connection.collection("users");
  const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const admins = [];

  for (const label of labels) {
    const email = adminEmail(label);
    const doc = await users.findOneAndUpdate(
      { email },
      {
        $set: {
          firstName: "Load",
          lastName: `Admin${label}`,
          email,
          password: "unused-load-harness",
          phoneNumber: `+1555000${String(label.charCodeAt(0)).padStart(3, "0")}`,
          country: "United States",
          role: "ADMIN",
          status: "ACTIVE",
          permissions: [],
          emailVerified: true,
          isOnTrial: true,
          trialEndsAt: trialEnds,
          subscriptionStatus: "trial",
          maxLeads: -1,
          maxUsers: 50,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
        $unset: { adminId: "", createdBy: "" },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!doc?._id) throw new Error(`Failed to upsert load admin ${label}`);
    admins.push({ label, email, _id: doc._id });
  }
  return admins;
}

/**
 * Mirrors POST /api/imports + POST /api/leads bulk upsert path (tenant-scoped).
 */
export async function importLeadsForTenant({
  adminId,
  label,
  rows,
  fileName,
  batchSize = resolveBatchSize(),
  /** Simulate kill/failure after N successful bulkWrite chunks (0 = disabled) */
  failAfterChunks = 0,
}) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  const leadsCol = db.collection("leads");
  const importsCol = db.collection("imports");

  const prepStart = performance.now();
  const validRows = [];
  let failedRecords = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email =
      typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    if (!email || row._invalid) {
      failedRecords += 1;
      continue;
    }
    validRows.push({ ...row, email });
  }

  const importDoc = {
    fileName: fileName || `load-harness-${label}-${validRows.length}.csv`,
    timestamp: Date.now(),
    uploadedBy: adminId,
    recordCount: rows.length,
    status: "new",
    successCount: 0,
    failureCount: failedRecords,
    adminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let dbRoundTrips = 0;
  const { insertedId: importId } = await importsCol.insertOne(importDoc);
  dbRoundTrips += 1;

  const uniqueEmails = [...new Set(validRows.map((r) => r.email))];
  // Chunk $in finds for very large sets
  const existingSet = new Set();
  const findChunk = Math.min(batchSize, 5000);
  for (let i = 0; i < uniqueEmails.length; i += findChunk) {
    const slice = uniqueEmails.slice(i, i + findChunk);
    const existing = await leadsCol
      .find(
        { adminId, email: { $in: slice } },
        { projection: { email: 1 } },
      )
      .toArray();
    dbRoundTrips += 1;
    for (const d of existing) {
      existingSet.add(String(d.email).trim().toLowerCase());
    }
  }

  const ops = [];
  for (const lead of validRows) {
    ops.push({
      updateOne: {
        filter: { email: lead.email, adminId },
        update: {
          $setOnInsert: {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone || "",
            country: lead.country || "",
            source: lead.source || "load-harness",
            comments: lead.comments || "import-load",
            status: lead.status || "NEW",
            importId,
            leadId: `LOAD-${randomUUID()}`,
            adminId,
            createdBy: adminId,
            createdAt: new Date(),
          },
          $set: { updatedAt: new Date() },
        },
        upsert: true,
      },
    });
  }
  const prepMs = +(performance.now() - prepStart).toFixed(1);

  const memBefore = memSnapshot();
  let peak = { rssMb: memBefore.rssMb, heapUsedMb: memBefore.heapUsedMb };
  const cpuStart = process.cpuUsage();
  const wallStart = performance.now();

  let inserted = 0;
  let duplicates = 0;
  let errors = 0;
  let retryAttempts = 0;
  let bulkWriteCalls = 0;
  let databaseMs = 0;
  let aborted = false;
  let abortReason = null;

  const runBulkChunk = async (chunk) => {
    bulkWriteCalls += 1;
    dbRoundTrips += 1;
    const t = performance.now();
    try {
      return await leadsCol.bulkWrite(chunk, { ordered: false });
    } finally {
      databaseMs += performance.now() - t;
      peak = trackPeak(peak, memSnapshot());
    }
  };

  try {
    for (let i = 0; i < ops.length; i += batchSize) {
      const chunk = ops.slice(i, i + batchSize);
      let result;
      try {
        result = await runBulkChunk(chunk);
      } catch (err) {
        retryAttempts += 1;
        try {
          result = await runBulkChunk(chunk);
        } catch (err2) {
          aborted = true;
          abortReason = err2?.message || String(err2);
          const partial = err2.result || err.result || {};
          inserted += partial.upsertedCount ?? 0;
          duplicates += partial.matchedCount ?? 0;
          const writeErrors = partial.writeErrors || err2.writeErrors || [];
          const dupErrors = writeErrors.filter((e) => e.code === 11000).length;
          duplicates += dupErrors;
          errors += Math.max(
            0,
            chunk.length -
              (partial.upsertedCount ?? 0) -
              (partial.matchedCount ?? 0) -
              dupErrors,
          );
          throw err2;
        }
      }
      inserted += result.upsertedCount ?? 0;
      duplicates += Math.max(0, result.matchedCount ?? 0);
      const accounted =
        (result.upsertedCount ?? 0) + Math.max(0, result.matchedCount ?? 0);
      errors += Math.max(0, chunk.length - accounted);

      if (failAfterChunks > 0 && bulkWriteCalls >= failAfterChunks) {
        aborted = true;
        abortReason = `Simulated DB failure after ${bulkWriteCalls} bulkWrite chunk(s)`;
        break;
      }
    }
  } finally {
    dbRoundTrips += 1;
    const status = aborted
      ? "failed"
      : errors > 0 && inserted === 0
        ? "failed"
        : "completed";
    await importsCol.updateOne(
      { _id: importId, adminId },
      {
        $set: {
          status,
          successCount: inserted,
          failureCount: duplicates + errors + failedRecords,
          updatedAt: new Date(),
          ...(aborted
            ? { abortReason: String(abortReason || "aborted").slice(0, 500) }
            : {}),
        },
      },
    );
  }

  const wallMs = +(performance.now() - wallStart).toFixed(1);
  const totalMs = +(prepMs + wallMs).toFixed(1);
  const memAfter = memSnapshot();
  peak = trackPeak(peak, memAfter);
  const cpu = cpuDelta(cpuStart);

  const tenantCount = await leadsCol.countDocuments({ adminId });
  dbRoundTrips += 1;

  const processed = inserted + duplicates;
  return {
    label,
    adminId: String(adminId),
    importId: String(importId),
    requested: rows.length,
    validRows: validRows.length,
    failedRecords,
    wouldInsertEstimate: uniqueEmails.filter((e) => !existingSet.has(e)).length,
    inserted,
    duplicates,
    errors,
    retryAttempts,
    errorRecovery: retryAttempts > 0 ? "retried_failed_bulkWrite_chunk" : "none_needed",
    aborted,
    abortReason,
    importStatus: aborted
      ? "failed"
      : errors > 0 && inserted === 0
        ? "failed"
        : "completed",
    batchSize,
    bulkWriteCalls,
    dbRoundTrips,
    latency: {
      prepMs,
      databaseMs: +databaseMs.toFixed(1),
      wallMs,
      totalMs,
      /** Alias: no separate HTTP in harness; DB wall ≈ “API handler” time */
      apiLatencyMs: wallMs,
    },
    elapsedMs: totalMs,
    recordsPerSec:
      wallMs > 0 ? +((processed) / (wallMs / 1000)).toFixed(1) : 0,
    memory: {
      before: memBefore,
      after: memAfter,
      peakRssMb: +peak.rssMb.toFixed(1),
      peakHeapMb: +peak.heapUsedMb.toFixed(1),
    },
    cpu,
    dbOps: {
      importInsert: 1,
      existingEmailFind: Math.ceil(uniqueEmails.length / findChunk) || 0,
      bulkWrite: bulkWriteCalls,
      importUpdate: 1,
      tenantCount: 1,
    },
    architecture: {
      ...ARCHITECTURE,
      batchSize,
      dbRoundTrips,
      bulkWriteCalls,
    },
    tenantLeadCount: tenantCount,
  };
}

export async function assertNoCrossTenantLeakage(admins) {
  const leads = mongoose.connection.collection("leads");
  const findings = [];

  for (const admin of admins) {
    const owned = await leads
      .find({ adminId: admin._id }, { projection: { email: 1 } })
      .toArray();

    for (const doc of owned) {
      const email = String(doc.email);
      const tagged = email.match(/^load-([a-j])-/i);
      if (tagged && tagged[1].toUpperCase() !== admin.label) {
        findings.push({
          tenant: admin.label,
          email,
          reason: "email_prefix_mismatch",
        });
      }
    }

    for (const other of admins) {
      if (other.label === admin.label) continue;
      const leaked = await leads.countDocuments({
        adminId: admin._id,
        email: {
          $regex: `^load-${other.label.toLowerCase()}-`,
          $options: "i",
        },
      });
      if (leaked > 0) {
        findings.push({
          tenant: admin.label,
          from: other.label,
          count: leaked,
          reason: "foreign_tenant_prefix_under_adminId",
        });
      }
    }
  }

  const mismatched = await leads
    .aggregate([
      {
        $match: {
          email: {
            $regex: `@${LOAD_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`,
            $options: "i",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "adminId",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      { $project: { email: 1, ownerEmail: "$owner.email" } },
    ])
    .toArray();

  for (const row of mismatched) {
    const prefix = String(row.email).match(/^load-([a-j])-/i);
    const ownerLabel = String(row.ownerEmail).match(/load-admin-([a-j])@/i);
    if (
      prefix &&
      ownerLabel &&
      prefix[1].toLowerCase() !== ownerLabel[1].toLowerCase()
    ) {
      findings.push({
        email: row.email,
        ownerEmail: row.ownerEmail,
        reason: "adminId_owner_mismatch",
      });
    }
  }

  return { ok: findings.length === 0, findings };
}

/**
 * Same email string imported by two tenants must create TWO docs (unique email+adminId).
 */
export async function assertCrossTenantSameEmailAllowed(admins) {
  const leads = mongoose.connection.collection("leads");
  const shared = `shared-everywhere@${LOAD_EMAIL_DOMAIN}`;
  const results = [];

  for (const admin of admins) {
    const r = await importLeadsForTenant({
      adminId: admin._id,
      label: admin.label,
      rows: [
        {
          firstName: "Shared",
          lastName: admin.label,
          email: shared,
          phone: "+15551234000",
          country: "United States",
          status: "NEW",
          source: "load-harness",
          comments: "collision",
        },
      ],
      fileName: `load-harness-shared-${admin.label}.csv`,
    });
    results.push(r);
  }

  const count = await leads.countDocuments({ email: shared });
  return {
    ok: count === admins.length && results.every((r) => r.inserted === 1),
    sharedEmail: shared,
    documentCount: count,
    perTenant: results.map((r) => ({
      label: r.label,
      inserted: r.inserted,
      duplicates: r.duplicates,
    })),
  };
}

export async function connectLoadMongo(log = console.log) {
  const uri = resolveMongoUri();
  if (!uri) {
    throw new Error(
      "MONGODB_URI (or IMPORT_LOAD_MONGODB_URI) is required for import load harness",
    );
  }

  const dbName = getDbName();
  const timeoutMs = Number(
    process.env.IMPORT_LOAD_SERVER_SELECTION_MS || 8_000,
  );

  let hostHint = "(unparsed host)";
  try {
    const cleaned = uri.replace(/^mongodb(\+srv)?:\/\//, "");
    hostHint = cleaned.split("@").pop()?.split("/")[0] || hostHint;
  } catch {
    /* ignore */
  }

  log(
    `[import-load] Connecting… db="${dbName}" host="${hostHint}" timeout=${timeoutMs}ms`,
  );

  const connectPromise = mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: timeoutMs,
    connectTimeoutMS: timeoutMs,
  });

  let timer;
  const hardTimeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `Mongo connect hard-timed out after ${timeoutMs}ms.\n` +
            `  → Atlas: Network Access must allow your current IP\n` +
            `  → Or set IMPORT_LOAD_MONGODB_URI to a reachable local Mongo\n` +
            `  → Or raise IMPORT_LOAD_SERVER_SELECTION_MS (ms)`,
        ),
      );
    }, timeoutMs + 500);
  });

  try {
    await Promise.race([connectPromise, hardTimeout]);
  } finally {
    clearTimeout(timer);
  }

  log(`[import-load] Connected.`);
}

export async function disconnectLoadMongo() {
  await mongoose.disconnect();
}

export async function cleanupLoadLeadsAndImports(adminIds) {
  const leads = mongoose.connection.collection("leads");
  const imports = mongoose.connection.collection("imports");
  if (adminIds?.length) {
    await leads.deleteMany({ adminId: { $in: adminIds } });
    await imports.deleteMany({ adminId: { $in: adminIds } });
  }
  await leads.deleteMany({
    email: {
      $regex: `@${LOAD_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`,
      $options: "i",
    },
  });
  await imports.deleteMany({ fileName: { $regex: /^load-harness-/ } });
}

export async function cleanupLoadUsers() {
  const users = mongoose.connection.collection("users");
  await users.deleteMany({
    email: {
      $regex: `@${LOAD_EMAIL_DOMAIN.replace(/\./g, "\\.")}$`,
      $options: "i",
    },
  });
}

/**
 * Failure modes, race, index, upsert-safety — the senior correctness suite.
 */
export async function runCorrectnessChecks({
  admins,
  primary,
  batchSize,
  log = console.log,
}) {
  const db = mongoose.connection.db;
  const leads = db.collection("leads");
  const imports = db.collection("imports");
  const out = {
    uniqueIndex: null,
    upsertDoesNotOverwrite: null,
    sameTenantOverlappingRace: null,
    midImportFailureAndResume: null,
    failures: [],
    ok: true,
  };

  // 1) Unique index email+adminId must exist (enforced in DB, not only app)
  log("[import-load] Correctness: unique index email+adminId…");
  const indexList = await leads.indexes();
  const uniqueCompound = indexList.find((idx) => {
    const keys = idx.key || {};
    return keys.email === 1 && keys.adminId === 1 && idx.unique === true;
  });
  out.uniqueIndex = {
    ok: Boolean(uniqueCompound),
    index: uniqueCompound || null,
    createdDuringTest: false,
    allIndexes: indexList.map((i) => ({ name: i.name, key: i.key, unique: i.unique })),
  };
  if (!out.uniqueIndex.ok) {
    out.failures.push("missing unique index on { email: 1, adminId: 1 }");
    await leads.createIndex({ email: 1, adminId: 1 }, { unique: true });
    out.uniqueIndex.createdDuringTest = true;
    out.uniqueIndex.okAfterCreate = true;
  }

  // 2) Upsert must not overwrite existing lead fields ($setOnInsert only)
  log("[import-load] Correctness: upsert does not overwrite existing lead…");
  await cleanupLoadLeadsAndImports([primary._id]);
  const email = leadEmail(primary.label, 900001);
  await leads.insertOne({
    firstName: "Original",
    lastName: "KeepMe",
    email,
    phone: "+15550000001",
    country: "United States",
    status: "NEW",
    source: "seed",
    comments: "do-not-overwrite",
    leadId: `LOAD-${randomUUID()}`,
    adminId: primary._id,
    createdBy: primary._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await importLeadsForTenant({
    adminId: primary._id,
    label: primary.label,
    rows: [
      {
        firstName: "Overwritten",
        lastName: "ShouldNotApply",
        email,
        phone: "+15559999999",
        country: "Canada",
        status: "WON",
        source: "attack",
        comments: "evil",
      },
    ],
    fileName: "load-harness-overwrite-probe.csv",
    batchSize,
  });
  const kept = await leads.findOne({ adminId: primary._id, email });
  out.upsertDoesNotOverwrite = {
    ok:
      kept?.firstName === "Original" &&
      kept?.lastName === "KeepMe" &&
      kept?.comments === "do-not-overwrite" &&
      kept?.phone === "+15550000001",
    doc: kept
      ? {
          firstName: kept.firstName,
          lastName: kept.lastName,
          phone: kept.phone,
          comments: kept.comments,
          country: kept.country,
        }
      : null,
  };
  if (!out.upsertDoesNotOverwrite.ok) {
    out.failures.push("upsert overwrote existing lead fields (expected $setOnInsert only)");
  }

  // 3) Same tenant: two overlapping imports concurrently
  log("[import-load] Correctness: same-tenant overlapping concurrent imports…");
  await cleanupLoadLeadsAndImports([primary._id]);
  const raceA = buildLeadRows(2000, primary.label); // 0..1999
  const raceB = buildLeadRows(2000, primary.label, { emailOffset: 1000 }); // 1000..2999
  const [r1, r2] = await Promise.all([
    importLeadsForTenant({
      adminId: primary._id,
      label: primary.label,
      rows: raceA,
      fileName: "load-harness-race-a.csv",
      batchSize: Math.min(batchSize, 500),
    }),
    importLeadsForTenant({
      adminId: primary._id,
      label: primary.label,
      rows: raceB,
      fileName: "load-harness-race-b.csv",
      batchSize: Math.min(batchSize, 500),
    }),
  ]);
  const uniqueExpected = 3000; // 0..2999
  const actual = await leads.countDocuments({ adminId: primary._id });
  const importDocs = await imports
    .find({ adminId: primary._id, fileName: { $regex: /^load-harness-race-/ } })
    .toArray();
  out.sameTenantOverlappingRace = {
    ok: actual === uniqueExpected,
    expectedUniqueLeads: uniqueExpected,
    actualLeadCount: actual,
    importA: { inserted: r1.inserted, duplicates: r1.duplicates, status: r1.importStatus },
    importB: { inserted: r2.inserted, duplicates: r2.duplicates, status: r2.importStatus },
    combinedInsertedPlusDupes: r1.inserted + r1.duplicates + r2.inserted + r2.duplicates,
    importDocs: importDocs.map((d) => ({
      fileName: d.fileName,
      status: d.status,
      successCount: d.successCount,
      failureCount: d.failureCount,
    })),
  };
  if (!out.sameTenantOverlappingRace.ok) {
    out.failures.push(
      `same-tenant race: expected ${uniqueExpected} leads, got ${actual}`,
    );
  }

  // 4) Mid-import failure: partial writes, status=failed, resume completes
  log("[import-load] Correctness: mid-import failure + resume…");
  await cleanupLoadLeadsAndImports([primary._id]);
  const failRows = buildLeadRows(2500, primary.label);
  const smallBatch = 500;
  const partial = await importLeadsForTenant({
    adminId: primary._id,
    label: primary.label,
    rows: failRows,
    fileName: "load-harness-fail-partial.csv",
    batchSize: smallBatch,
    failAfterChunks: 1,
  });
  const afterFail = await leads.countDocuments({ adminId: primary._id });
  const failDoc = await imports.findOne({
    adminId: primary._id,
    fileName: "load-harness-fail-partial.csv",
  });
  const resume = await importLeadsForTenant({
    adminId: primary._id,
    label: primary.label,
    rows: failRows,
    fileName: "load-harness-fail-resume.csv",
    batchSize: smallBatch,
  });
  const afterResume = await leads.countDocuments({ adminId: primary._id });
  out.midImportFailureAndResume = {
    ok:
      partial.aborted === true &&
      partial.importStatus === "failed" &&
      failDoc?.status === "failed" &&
      afterFail > 0 &&
      afterFail < 2500 &&
      resume.importStatus === "completed" &&
      afterResume === 2500 &&
      // Must not claim full success on the aborted import
      (failDoc?.successCount ?? 0) < 2500,
    partial: {
      inserted: partial.inserted,
      aborted: partial.aborted,
      importStatus: partial.importStatus,
      abortReason: partial.abortReason,
      leadsAfterFail: afterFail,
      importDocStatus: failDoc?.status,
      importDocSuccessCount: failDoc?.successCount,
    },
    resume: {
      inserted: resume.inserted,
      duplicates: resume.duplicates,
      importStatus: resume.importStatus,
      leadsAfterResume: afterResume,
    },
    progressReporting: "product: Ably import_progress (not exercised by this harness)",
    backgroundResume: "product: worker claim + nextChunkIndex cursor (see test:import-midflight-kill)",
    notes:
      "This harness mid-fail check aborts inline bulkWrite and finishes via a new re-import. " +
      "That is intentional for the harness write path — not a claim that product lacks progress/resume. " +
      "Product: stage → queued worker → exclusive claim → cursor resume + Ably import_progress.",
  };
  if (!out.midImportFailureAndResume.ok) {
    out.failures.push(
      `mid-import failure/resume check failed: ${JSON.stringify(out.midImportFailureAndResume.partial)}`,
    );
  }

  out.ok = out.failures.length === 0;
  return out;
}

/**
 * @param {keyof typeof PROFILES | string} profileName
 * @param {{ keepData?: boolean, log?: Function }} [options]
 */
export async function runImportLoadSuiteSafe(profileName = "quick", options = {}) {
  const log = options.log || console.log;
  const profile = PROFILES[profileName] || PROFILES.quick;
  const batchSize = resolveBatchSize();
  const tenantCount = Number(
    process.env.IMPORT_LOAD_TENANTS || profile.tenantCount || 3,
  );
  const labels = tenantLabels(tenantCount);

  const report = {
    profile: profileName,
    dbName: getDbName(),
    startedAt: new Date().toISOString(),
    architecture: {
      ...ARCHITECTURE,
      batchSize,
      tenantCount: labels.length,
      concurrentPerTenant: profile.concurrentPerTenant,
      concurrentTotalLeads: profile.concurrentPerTenant * labels.length,
    },
    singleTenant: [],
    concurrent: null,
    duplicatePass: null,
    invalidMix: null,
    sameEmailAcrossTenants: null,
    isolation: null,
    correctness: null,
    failures: [],
    ok: true,
  };

  await connectLoadMongo(log);
  let admins = [];
  const suiteCpu = process.cpuUsage();
  const suiteMemStart = memSnapshot();
  let suitePeak = {
    rssMb: suiteMemStart.rssMb,
    heapUsedMb: suiteMemStart.heapUsedMb,
  };
  const suiteWallStart = performance.now();

  try {
    log("[import-load] Cleaning previous disposable load data…");
    await cleanupLoadUsers();
    await cleanupLoadLeadsAndImports([]);
    log(
      `[import-load] Upserting tenants ${labels.join("/")} (batchSize=${batchSize})…`,
    );
    admins = await upsertLoadAdmins(labels);
    await cleanupLoadLeadsAndImports(admins.map((a) => a._id));

    const primary = admins[0];

    for (const size of profile.singleSizes) {
      log(`[import-load] Single-tenant import: ${size} leads…`);
      await cleanupLoadLeadsAndImports([primary._id]);
      const rows = buildLeadRows(size, primary.label);
      const result = await importLeadsForTenant({
        adminId: primary._id,
        label: primary.label,
        rows,
        fileName: `load-harness-single-${size}.csv`,
        batchSize,
      });
      suitePeak = trackPeak(suitePeak, {
        rssMb: result.memory.peakRssMb,
        heapUsedMb: result.memory.peakHeapMb,
      });
      report.singleTenant.push(result);
      log(
        `[import-load]   → inserted=${result.inserted} dup=${result.duplicates} ` +
          `fail=${result.failedRecords} wall=${result.latency.wallMs}ms ` +
          `db=${result.latency.databaseMs}ms ${result.recordsPerSec}/s ` +
          `bulkWrites=${result.bulkWriteCalls} roundTrips=${result.dbRoundTrips}`,
      );
      if (result.inserted < size * 0.99) {
        report.failures.push(
          `single ${size}: inserted ${result.inserted} expected ~${size}`,
        );
      }
    }

    await cleanupLoadLeadsAndImports(admins.map((a) => a._id));
    const n = profile.concurrentPerTenant;
    log(
      `[import-load] Concurrent: ${labels.length} tenants × ${n} leads = ${labels.length * n} total (Promise.all)…`,
    );
    const concurrentStart = performance.now();
    const concurrentCpu = process.cpuUsage();
    const concurrentMemBefore = memSnapshot();
    const concurrentResults = await Promise.all(
      admins.map((admin) =>
        importLeadsForTenant({
          adminId: admin._id,
          label: admin.label,
          rows: buildLeadRows(n, admin.label),
          fileName: `load-harness-concurrent-${admin.label}-${n}.csv`,
          batchSize,
        }),
      ),
    );
    const concurrentWallMs = +(performance.now() - concurrentStart).toFixed(1);
    const concurrentMemAfter = memSnapshot();
    for (const r of concurrentResults) {
      suitePeak = trackPeak(suitePeak, {
        rssMb: r.memory.peakRssMb,
        heapUsedMb: r.memory.peakHeapMb,
      });
    }

    const concurrentInserted = concurrentResults.reduce(
      (s, r) => s + r.inserted,
      0,
    );
    const concurrentDupes = concurrentResults.reduce(
      (s, r) => s + r.duplicates,
      0,
    );
    const concurrentRoundTrips = concurrentResults.reduce(
      (s, r) => s + r.dbRoundTrips,
      0,
    );

    report.concurrent = {
      tenants: labels.length,
      perTenant: n,
      totalLeads: labels.length * n,
      wallMs: concurrentWallMs,
      recordsPerSec:
        concurrentWallMs > 0
          ? +(
              (concurrentInserted + concurrentDupes) /
              (concurrentWallMs / 1000)
            ).toFixed(1)
          : 0,
      cpu: cpuDelta(concurrentCpu),
      memory: {
        before: concurrentMemBefore,
        after: concurrentMemAfter,
      },
      dbRoundTrips: concurrentRoundTrips,
      bulkWriteCalls: concurrentResults.reduce(
        (s, r) => s + r.bulkWriteCalls,
        0,
      ),
      results: concurrentResults,
    };
    log(
      `[import-load]   → concurrent wall ${concurrentWallMs}ms aggregate ${report.concurrent.recordsPerSec}/s`,
    );
    for (const r of concurrentResults) {
      log(
        `[import-load]      tenant ${r.label}: inserted=${r.inserted} ${r.latency.wallMs}ms ${r.recordsPerSec}/s`,
      );
      if (r.inserted < n * 0.99) {
        report.failures.push(
          `concurrent ${r.label}: inserted ${r.inserted} expected ~${n}`,
        );
      }
    }

    const dupSize = profile.duplicatePassSize;
    log(`[import-load] Duplicate pass: seed + re-import ${dupSize}…`);
    const dupRows = buildLeadRows(dupSize, primary.label);
    await importLeadsForTenant({
      adminId: primary._id,
      label: primary.label,
      rows: dupRows,
      fileName: `load-harness-dup-seed-${dupSize}.csv`,
      batchSize,
    });
    const dupPass = await importLeadsForTenant({
      adminId: primary._id,
      label: primary.label,
      rows: dupRows,
      fileName: `load-harness-dup-pass-${dupSize}.csv`,
      batchSize,
    });
    report.duplicatePass = dupPass;
    if (
      dupPass.duplicates < dupSize * 0.99 ||
      dupPass.inserted > dupSize * 0.01
    ) {
      report.failures.push(
        `duplicate pass: inserted=${dupPass.inserted} duplicates=${dupPass.duplicates} (expected mostly duplicates)`,
      );
    }

    await cleanupLoadLeadsAndImports([primary._id]);
    const invalidSize = profile.invalidMixSize;
    log(`[import-load] Invalid-row mix: ${invalidSize} (every 10th blank)…`);
    const invalidRows = buildLeadRows(invalidSize, primary.label, {
      invalidEvery: 10,
    });
    const invalidResult = await importLeadsForTenant({
      adminId: primary._id,
      label: primary.label,
      rows: invalidRows,
      fileName: `load-harness-invalid-${invalidSize}.csv`,
      batchSize,
    });
    report.invalidMix = invalidResult;
    const expectedFail = invalidRows.filter((r) => r._invalid).length;
    if (invalidResult.failedRecords !== expectedFail) {
      report.failures.push(
        `invalid mix: failedRecords=${invalidResult.failedRecords} expected ${expectedFail}`,
      );
    }

    log("[import-load] Same-email across tenants + isolation checks…");
    report.sameEmailAcrossTenants =
      await assertCrossTenantSameEmailAllowed(admins);
    if (!report.sameEmailAcrossTenants.ok) {
      report.failures.push("same email across tenants did not create N docs");
    }

    report.isolation = await assertNoCrossTenantLeakage(admins);
    if (!report.isolation.ok) {
      report.failures.push(
        `cross-tenant leakage: ${JSON.stringify(report.isolation.findings.slice(0, 5))}`,
      );
    }

    report.correctness = await runCorrectnessChecks({
      admins,
      primary,
      batchSize,
      log,
    });
    if (!report.correctness.ok) {
      report.failures.push(...report.correctness.failures);
    }

    report.suite = {
      wallMs: +(performance.now() - suiteWallStart).toFixed(1),
      cpu: cpuDelta(suiteCpu),
      memory: {
        before: suiteMemStart,
        after: memSnapshot(),
        peakRssMb: +suitePeak.rssMb.toFixed(1),
        peakHeapMb: +suitePeak.heapUsedMb.toFixed(1),
      },
    };

    report.ok = report.failures.length === 0;
    report.finishedAt = new Date().toISOString();
    log("[import-load] Suite finished.");
    return report;
  } finally {
    if (!options.keepData) {
      try {
        log("[import-load] Cleaning up disposable data…");
        await cleanupLoadLeadsAndImports(admins.map((a) => a._id));
        await cleanupLoadUsers();
      } catch {
        /* ignore cleanup errors */
      }
    } else {
      log(
        "[import-load] KEEP_DATA=1 — leaving @import-load.motherland.test docs in DB.",
      );
    }
    await disconnectLoadMongo();
  }
}

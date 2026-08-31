#!/usr/bin/env node
/**
 * Diagnose MongoDB latency on the users-create + JWT session hot path.
 *
 * Mirrors app pool defaults (dbConfig) and the fixed query shapes:
 *   - JWT: one combined findById (password + RBAC fields)
 *   - Create: loadAdmin, then seatCount + emailDupeCheck in parallel
 *
 * Usage:
 *   npm run mongo:users-create-explain
 *   node --env-file=.env scripts/mongo-users-create-explain.mjs
 *   node --env-file=.env scripts/mongo-users-create-explain.mjs --idle-test
 */
import mongoose from "mongoose";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e-admin@motherland.test";
const idleTest = process.argv.includes("--idle-test");

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

/** Same defaults as src/libs/dbConfig.ts */
function getPoolOptions() {
  const maxPoolSize = Math.max(
    1,
    Number.parseInt(process.env.MONGODB_MAX_POOL_SIZE ?? "5", 10) || 5,
  );
  const minPoolSize = Math.max(
    0,
    Number.parseInt(process.env.MONGODB_MIN_POOL_SIZE ?? "2", 10) || 2,
  );
  const maxIdleTimeMS = Math.max(
    10_000,
    Number.parseInt(process.env.MONGODB_MAX_IDLE_MS ?? "60000", 10) || 60_000,
  );
  return {
    dbName: getDbName(),
    maxPoolSize,
    minPoolSize: Math.min(minPoolSize, maxPoolSize),
    maxIdleTimeMS,
    family: 4,
  };
}

async function explainFind(db, label, filter) {
  const result = await db
    .collection("users")
    .find(filter)
    .limit(1)
    .explain("executionStats");
  const stats = result.executionStats;
  const stage =
    stats?.executionStages?.stage ??
    stats?.executionStages?.inputStage?.stage ??
    result.queryPlanner?.winningPlan?.stage;
  console.log(
    `[explain] ${label}: exec=${stats?.executionTimeMillis ?? "?"}ms ` +
      `stage=${stage} keys=${stats?.totalKeysExamined ?? "?"} ` +
      `docs=${stats?.totalDocsExamined ?? "?"} nReturned=${stats?.nReturned ?? "?"}`,
  );
}

async function explainCount(db, label, filter) {
  const pipeline = [{ $match: filter }, { $count: "n" }];
  const result = await db
    .collection("users")
    .aggregate(pipeline)
    .explain("executionStats");
  const stats =
    result.executionStats ??
    result.stages?.find((s) => s.$cursor)?.executionStats;
  const stage = stats?.executionStages?.stage ?? "?";
  console.log(
    `[explain] ${label}: exec=${stats?.executionTimeMillis ?? "?"}ms ` +
      `stage=${stage} keys=${stats?.totalKeysExamined ?? "?"} ` +
      `docs=${stats?.totalDocsExamined ?? "?"}`,
  );
}

async function listIndexes(db) {
  const indexes = await db.collection("users").indexes();
  console.log("[indexes] users collection:");
  for (const idx of indexes) {
    console.log(`  ${idx.name}: ${JSON.stringify(idx.key)}`);
  }
}

async function timed(label, fn) {
  const t0 = performance.now();
  await fn();
  console.log(`[timing] ${label}: ${(performance.now() - t0).toFixed(1)}ms`);
}

/** Old warm path: 2 parallel JWT findById + 3 parallel create reads */
async function simulateLegacyWarmPath(db, adminId, sampleEmail) {
  const t0 = performance.now();
  await Promise.all([
    db.collection("users").findOne({ _id: adminId }, { projection: { passwordChangedAt: 1 } }),
    db
      .collection("users")
      .findOne(
        { _id: adminId },
        {
          projection: {
            role: 1,
            permissions: 1,
            status: 1,
            adminId: 1,
            canViewPhoneNumbers: 1,
            canViewEmails: 1,
          },
        },
      ),
  ]);
  const jwtMs = performance.now() - t0;

  const t1 = performance.now();
  await Promise.all([
    db.collection("users").findOne({ _id: adminId }),
    db.collection("users").countDocuments({ adminId }),
    db.collection("users").findOne({ email: sampleEmail }),
  ]);
  const createMs = performance.now() - t1;

  console.log(
    `[timing] legacy warm path: jwtParallel2=${jwtMs.toFixed(1)}ms createParallel3=${createMs.toFixed(1)}ms total=${(jwtMs + createMs).toFixed(1)}ms`,
  );
}

/** Current app path: 1 JWT findById + loadAdmin then parallel seat/email */
async function simulateCurrentWarmPath(db, adminId, sampleEmail) {
  const t0 = performance.now();
  await db.collection("users").findOne(
    { _id: adminId },
    {
      projection: {
        passwordChangedAt: 1,
        role: 1,
        permissions: 1,
        status: 1,
        adminId: 1,
        canViewPhoneNumbers: 1,
        canViewEmails: 1,
      },
    },
  );
  const jwtMs = performance.now() - t0;

  const t1 = performance.now();
  await db.collection("users").findOne({ _id: adminId });
  const loadAdminMs = performance.now() - t1;

  const t2 = performance.now();
  await Promise.all([
    db.collection("users").countDocuments({ adminId }),
    db.collection("users").findOne({ email: sampleEmail }),
  ]);
  const gateMs = performance.now() - t2;

  console.log(
    `[timing] current warm path: jwtCombined=${jwtMs.toFixed(1)}ms loadAdmin=${loadAdminMs.toFixed(1)}ms seatEmailParallel=${gateMs.toFixed(1)}ms total=${(jwtMs + loadAdminMs + gateMs).toFixed(1)}ms`,
  );
}

async function idlePoolTest(db, adminId) {
  console.log("\n--- idle pool test (parallel 2 after N seconds idle) ---");
  await db.collection("users").findOne({ _id: adminId });
  for (const waitSec of [0, 5, 11]) {
    if (waitSec > 0) {
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      console.log(`--- after ${waitSec}s idle ---`);
    }
    const t0 = performance.now();
    await Promise.all([
      db.collection("users").findOne({ _id: adminId }),
      db.collection("users").findOne({ _id: adminId }),
    ]);
    console.log(`[timing] parallel 2: ${(performance.now() - t0).toFixed(1)}ms`);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  const pool = getPoolOptions();
  console.log(
    `[pool] maxPoolSize=${pool.maxPoolSize} minPoolSize=${pool.minPoolSize} maxIdleTimeMS=${pool.maxIdleTimeMS}`,
  );

  await mongoose.connect(uri, pool);
  const db = mongoose.connection.db;
  if (!db) throw new Error("no db");

  const admin = await db.collection("users").findOne({ email: ADMIN_EMAIL });
  if (!admin?._id) throw new Error(`admin not found: ${ADMIN_EMAIL}`);
  const adminId = admin._id;
  const sampleEmail = `e2e.user.create.probe.${Date.now()}@motherland.test`;

  console.log(`adminId=${adminId} db=${pool.dbName}\n`);
  await listIndexes(db);

  console.log("\n--- single queries (sequential) ---");
  await timed("findById _id", () =>
    db.collection("users").findOne({ _id: adminId }),
  );
  await timed("countDocuments adminId", () =>
    db.collection("users").countDocuments({ adminId }),
  );
  await timed("findOne email (miss)", () =>
    db.collection("users").findOne({ email: sampleEmail }),
  );

  console.log("\n--- warm path comparison ---");
  await simulateLegacyWarmPath(db, adminId, sampleEmail);
  await simulateCurrentWarmPath(db, adminId, sampleEmail);

  console.log("\n--- explain plans ---");
  await explainFind(db, "findById _id", { _id: adminId });
  await explainFind(db, "findOne email (miss)", { email: sampleEmail });
  await explainCount(db, "count adminId", { adminId });

  if (idleTest) {
    await idlePoolTest(db, adminId);
  } else {
    console.log(
      "\n(tip) run with --idle-test to reproduce ~1s spikes after maxIdleTimeMS idle",
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

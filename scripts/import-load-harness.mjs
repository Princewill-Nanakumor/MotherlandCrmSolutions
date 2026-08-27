#!/usr/bin/env node
/**
 * Level 4 import load harness — real MongoDB.
 *
 * Profiles:
 *   quick         100/500/1k + 3×1k concurrent
 *   medium        5k/10k + 3×10k concurrent   ← headline multi-tenant
 *   heavy         25k/50k + 5×10k concurrent
 *   stress        100k + 10×10k concurrent
 *   concurrent10k 3×10k only
 *
 * Usage:
 *   npm run test:import-load
 *   npm run test:import-load:medium
 *   npm run test:import-load:concurrent10k
 *   IMPORT_LOAD_TENANTS=5 IMPORT_LOAD_BATCH_SIZE=5000 npm run test:import-load:medium
 */
import {
  PROFILES,
  resolveMongoUri,
  resolveBatchSize,
  runImportLoadSuiteSafe,
  disconnectLoadMongo,
  ARCHITECTURE,
} from "./lib/importLoadCore.mjs";

function printReport(report) {
  console.log("\n=== Import load report ===");
  console.log(`profile: ${report.profile}  db: ${report.dbName}  ok: ${report.ok}`);
  console.log(`started: ${report.startedAt}  finished: ${report.finishedAt}`);

  console.log("\n-- Architecture --");
  console.log(`  harness write:   ${ARCHITECTURE.harnessWriteMode}`);
  console.log(`  write path:      ${ARCHITECTURE.writeApi}`);
  console.log(`  not using:       ${ARCHITECTURE.notUsing}`);
  console.log(`  unique key:      ${ARCHITECTURE.uniqueKey}`);
  console.log(`  batch size:      ${report.architecture.batchSize}`);
  console.log(`  tenants:         ${report.architecture.tenantCount}`);
  console.log(`  product path:    ${ARCHITECTURE.productHttpPath}`);

  if (report.suite) {
    console.log("\n-- Suite totals --");
    console.log(
      `  wall: ${report.suite.wallMs}ms  peak RSS: ${report.suite.memory.peakRssMb}MB  peak heap: ${report.suite.memory.peakHeapMb}MB`,
    );
    console.log(
      `  cpu: user ${report.suite.cpu.userMs}ms / system ${report.suite.cpu.systemMs}ms`,
    );
  }

  console.log("\n-- Single-tenant --");
  if (!report.singleTenant.length) {
    console.log("  (skipped for this profile)");
  }
  for (const r of report.singleTenant) {
    console.log(
      `  ${r.requested} rows → inserted=${r.inserted} dup=${r.duplicates} fail=${r.failedRecords} errors=${r.errors}`,
    );
    console.log(
      `    wall ${r.latency.wallMs}ms | db ${r.latency.databaseMs}ms | prep ${r.latency.prepMs}ms | ${r.recordsPerSec}/s`,
    );
    console.log(
      `    bulkWrites=${r.bulkWriteCalls} roundTrips=${r.dbRoundTrips} retries=${r.retryAttempts} recovery=${r.errorRecovery}`,
    );
    console.log(
      `    mem heap ${r.memory.before.heapUsedMb}→${r.memory.after.heapUsedMb}MB peak ${r.memory.peakHeapMb}MB | cpu u${r.cpu.userMs}/s${r.cpu.systemMs}ms`,
    );
  }

  if (report.concurrent) {
    const c = report.concurrent;
    console.log(
      `\n-- Concurrent (${c.tenants} tenants × ${c.perTenant} = ${c.totalLeads} leads) --`,
    );
    console.log(
      `  wall ${c.wallMs}ms | aggregate ${c.recordsPerSec}/s | bulkWrites=${c.bulkWriteCalls} roundTrips=${c.dbRoundTrips}`,
    );
    console.log(
      `  mem heap ${c.memory.before.heapUsedMb}→${c.memory.after.heapUsedMb}MB | cpu u${c.cpu.userMs}/s${c.cpu.systemMs}ms`,
    );
    for (const r of c.results) {
      console.log(
        `  tenant ${r.label}: inserted=${r.inserted} dup=${r.duplicates} fail=${r.failedRecords} ` +
          `wall=${r.latency.wallMs}ms db=${r.latency.databaseMs}ms ${r.recordsPerSec}/s ` +
          `roundTrips=${r.dbRoundTrips}`,
      );
    }
  }

  if (report.duplicatePass) {
    const d = report.duplicatePass;
    console.log(
      `\n-- Duplicate re-import -- inserted=${d.inserted} duplicates=${d.duplicates} ` +
        `wall=${d.latency.wallMs}ms`,
    );
  }

  if (report.invalidMix) {
    const i = report.invalidMix;
    console.log(
      `\n-- Invalid mix -- requested=${i.requested} inserted=${i.inserted} ` +
        `failedRecords=${i.failedRecords} wall=${i.latency.wallMs}ms`,
    );
  }

  if (report.sameEmailAcrossTenants) {
    const s = report.sameEmailAcrossTenants;
    console.log(
      `\n-- Same email across tenants -- ok=${s.ok} docs=${s.documentCount} email=${s.sharedEmail}`,
    );
  }

  if (report.isolation) {
    console.log(
      `\n-- Tenant isolation -- ok=${report.isolation.ok} findings=${report.isolation.findings.length}`,
    );
    if (report.isolation.findings.length) {
      console.log(JSON.stringify(report.isolation.findings.slice(0, 10), null, 2));
    }
  }

  if (report.correctness) {
    const c = report.correctness;
    console.log(`\n-- Correctness / failure modes -- ok=${c.ok}`);
    console.log(
      `  unique index {email,adminId}: ${c.uniqueIndex?.ok ? "present" : "MISSING"}` +
        (c.uniqueIndex?.createdDuringTest ? " (created during test)" : ""),
    );
    console.log(
      `  upsert does not overwrite: ${c.upsertDoesNotOverwrite?.ok ? "ok" : "FAIL"}`,
    );
    console.log(
      `  same-tenant overlapping race: ${c.sameTenantOverlappingRace?.ok ? "ok" : "FAIL"}` +
        ` (leads=${c.sameTenantOverlappingRace?.actualLeadCount}/${c.sameTenantOverlappingRace?.expectedUniqueLeads})`,
    );
    console.log(
      `  mid-import fail+resume: ${c.midImportFailureAndResume?.ok ? "ok" : "FAIL"}` +
        ` (partial=${c.midImportFailureAndResume?.partial?.leadsAfterFail}` +
        ` → resume=${c.midImportFailureAndResume?.resume?.leadsAfterResume})`,
    );
    console.log(
      `  harness resume style:   re-import after abort (this suite)`,
    );
    console.log(
      `  product progress/resume: Ably import_progress + worker cursor ` +
        `(npm run test:import-midflight-kill)`,
    );
  }

  console.log(
    `\nClaim (defensible): concurrent multi-tenant imports with no cross-tenant contamination ` +
      `in this workload — not “blazing-fast imports.”`,
  );

  if (report.failures.length) {
    console.log("\n-- Failures --");
    for (const f of report.failures) console.log(`  • ${f}`);
  }
  console.log("");
}

async function main() {
  if (process.env.RUN_IMPORT_MONGO_LOAD !== "1") {
    console.error(
      "Refusing to run: set RUN_IMPORT_MONGO_LOAD=1 to opt into real-Mongo import load tests.",
    );
    process.exit(2);
  }

  if (!resolveMongoUri()) {
    console.error("MONGODB_URI or IMPORT_LOAD_MONGODB_URI is required.");
    process.exit(2);
  }

  const profile = process.env.IMPORT_LOAD_PROFILE || "quick";
  if (!PROFILES[profile]) {
    console.error(
      `Unknown IMPORT_LOAD_PROFILE=${profile}. Use: ${Object.keys(PROFILES).join(", ")}`,
    );
    process.exit(2);
  }

  console.log(
    `Running import load profile="${profile}" batchSize=${resolveBatchSize()}. Disposable @import-load.motherland.test data.`,
  );
  console.log(
    "If this sits on “Connecting…” for ~8s then errors, Atlas is blocking this IP (Network Access whitelist).",
  );

  const keepData = process.env.IMPORT_LOAD_KEEP_DATA === "1";
  const report = await runImportLoadSuiteSafe(profile, { keepData });
  printReport(report);

  if (process.env.IMPORT_LOAD_JSON === "1") {
    console.log(JSON.stringify(report));
  }

  process.exit(report.ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error("\n[import-load] FAILED:");
  console.error(err?.message || err);
  try {
    await disconnectLoadMongo();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

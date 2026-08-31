/**
 * Gated real-Mongo import load + multi-tenant isolation.
 *
 * Skipped unless:
 *   RUN_IMPORT_MONGO_LOAD=1
 *   and MONGODB_URI (or IMPORT_LOAD_MONGODB_URI) is set
 *
 * Default `npm run test:run` stays offline. Opt in:
 *   RUN_IMPORT_MONGO_LOAD=1 npm run test:import-load:vitest
 */
import { describe, expect, it } from "vitest";
import type { ImportLoadSuiteReport } from "@/types/importLoadCore";
import {
  PROFILES,
  resolveMongoUri,
  runImportLoadSuiteSafe,
} from "../../scripts/lib/importLoadCore.mjs";

const enabled =
  process.env.RUN_IMPORT_MONGO_LOAD === "1" && Boolean(resolveMongoUri());

describe.skipIf(!enabled)("import load (real MongoDB)", () => {
  it(
    "quick profile: single + concurrent tenants, dupes, invalid rows, isolation",
    async () => {
      const report = (await runImportLoadSuiteSafe(
        "quick",
      )) as ImportLoadSuiteReport;

      expect(report.failures).toEqual([]);
      expect(report.ok).toBe(true);
      expect(report.singleTenant.length).toBe(PROFILES.quick.singleSizes.length);

      for (const r of report.singleTenant) {
        expect(r.elapsedMs).toBeGreaterThan(0);
        expect(r.inserted + r.duplicates + r.failedRecords + r.errors).toBeGreaterThan(
          0,
        );
        expect(r.memory.after.heapUsedMb).toBeGreaterThan(0);
        expect(r.dbOps.bulkWrite).toBeGreaterThanOrEqual(1);
      }

      expect(report.concurrent?.results).toHaveLength(
        PROFILES.quick.tenantCount,
      );
      for (const r of report.concurrent!.results) {
        expect(r.inserted).toBeGreaterThanOrEqual(
          PROFILES.quick.concurrentPerTenant * 0.99,
        );
        expect(r.architecture.writeApi).toContain("bulkWrite");
        expect(r.architecture.harnessWriteMode).toBe("inline_bulkWrite_await");
        expect(r.batchSize).toBeGreaterThan(0);
        expect(r.dbRoundTrips).toBeGreaterThan(0);
      }

      expect(report.duplicatePass!.duplicates).toBeGreaterThanOrEqual(
        PROFILES.quick.duplicatePassSize * 0.99,
      );
      expect(report.isolation!.ok).toBe(true);
      expect(report.sameEmailAcrossTenants!.ok).toBe(true);
    },
    300_000,
  );
});

describe.skipIf(enabled)("import load (real MongoDB) — skipped gate", () => {
  it("documents how to enable Level 4 Mongo import load", () => {
    expect(enabled).toBe(false);
  });
});

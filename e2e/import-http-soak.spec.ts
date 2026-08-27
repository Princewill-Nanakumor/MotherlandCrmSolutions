/**
 * Production-path HTTP soak: login → POST /api/imports → stage → worker run.
 * Proves the real dashboard API path (not the in-process load harness).
 *
 * Opt-in (slow / needs Mongo + running app):
 *   IMPORT_HTTP_SOAK=1 IMPORT_SOAK_SIZE=10000 npx playwright test e2e/import-http-soak.spec.ts
 *
 * Against Netlify:
 *   IMPORT_HTTP_SOAK=1 IMPORT_SOAK_SIZE=50000 PLAYWRIGHT_BASE_URL=https://your-site.netlify.app npx playwright test e2e/import-http-soak.spec.ts
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";

const enabled = process.env.IMPORT_HTTP_SOAK === "1";
const size = Number(process.env.IMPORT_SOAK_SIZE || 10_000);
const chunkSize = Math.max(
  100,
  Number(process.env.IMPORT_CLIENT_CHUNK_SIZE || 5_000),
);

/** Product max per upload — keep soak within the real API limit. */
const MAX_SOAK = 50_000;

function buildLeads(n: number, stamp: number) {
  return Array.from({ length: n }, (_, i) => ({
    firstName: "Soak",
    lastName: `L${i}`,
    email: `soak.${stamp}.${i}@e2e.motherland.test`,
    phone: `+1555${String(1000000 + i).slice(0, 7)}`,
    country: "United States",
    status: "NEW",
    source: "http-soak",
  }));
}

test.describe.configure({ mode: "serial" });

test.describe("import HTTP soak (API path)", () => {
  test.skip(!enabled, "Set IMPORT_HTTP_SOAK=1 to run");
  test.skip(
    size > MAX_SOAK,
    `IMPORT_SOAK_SIZE=${size} exceeds product max ${MAX_SOAK} leads per upload`,
  );

  test(
    `stage+worker soak for ${size} leads`,
    async ({ page }) => {
      test.setTimeout(Math.max(300_000, size * 20));

      await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

      const stamp = Date.now();
      const leads = buildLeads(size, stamp);
      const chunkTotal = Math.ceil(leads.length / chunkSize);
      const memBefore = await page.evaluate(() => {
        const p = performance as Performance & {
          memory?: { usedJSHeapSize: number };
        };
        return p.memory?.usedJSHeapSize ?? null;
      });

      const t0 = Date.now();
      const created = await apiJson(page, "/api/imports", {
        method: "POST",
        body: JSON.stringify({
          fileName: `soak-${size}.csv`,
          recordCount: size,
          timestamp: Date.now(),
        }),
      });
      expect([200, 202]).toContain(created.status);
      const importId = String(
        (created.body as { data?: { _id?: string } })?.data?._id || "",
      );
      expect(importId).toBeTruthy();
      const createMs = Date.now() - t0;

      const tStage = Date.now();
      for (let c = 0; c < chunkTotal; c++) {
        const slice = leads.slice(c * chunkSize, (c + 1) * chunkSize);
        const staged = await apiJson(page, `/api/imports/${importId}/stage`, {
          method: "POST",
          body: JSON.stringify({
            leads: slice.map((l) => ({ ...l, importId })),
            chunkIndex: c,
            chunkTotal,
            isLast: c === chunkTotal - 1,
          }),
        });
        expect([200, 202]).toContain(staged.status);
      }
      const stageMs = Date.now() - tStage;

      const tWorker = Date.now();
      let final:
        | {
            status?: string;
            processedCount?: number;
            successCount?: number;
            duplicateCount?: number;
            errorCount?: number;
            errorMessage?: string;
          }
        | undefined;

      let mongoRoundTrips = 0;
      let bulkWrites = 0;
      let quotaChecks = 0;
      let emailFinds = 0;
      let reconciles = 0;
      let workerTicks = 0;
      let chunksProcessed = 0;

      for (let i = 0; i < 600; i++) {
        const run = await apiJson(
          page,
          i === 0 ? "/api/imports/run?resetPerf=1" : "/api/imports/run",
          { method: "POST" },
        );
        workerTicks += 1;
        const runBody = run.body as {
          chunksProcessed?: number;
          perf?: {
            mongoRoundTrips?: number;
            bulkWrites?: number;
            quotaChecks?: number;
            emailFinds?: number;
            reconciles?: number;
          };
        };
        chunksProcessed += Number(runBody.chunksProcessed ?? 0);
        if (runBody.perf) {
          mongoRoundTrips = Number(runBody.perf.mongoRoundTrips ?? 0);
          bulkWrites = Number(runBody.perf.bulkWrites ?? 0);
          quotaChecks = Number(runBody.perf.quotaChecks ?? 0);
          emailFinds = Number(runBody.perf.emailFinds ?? 0);
          reconciles = Number(runBody.perf.reconciles ?? 0);
        }

        const list = await apiJson(page, "/api/imports");
        const imports =
          (list.body as { imports?: Array<Record<string, unknown>> })?.imports ||
          [];
        const doc = imports.find((imp) => String(imp._id) === importId);
        if (doc) {
          final = doc as typeof final;
          if (doc.status === "completed" || doc.status === "failed") break;
        }
        await page.waitForTimeout(250);
      }
      const workerMs = Date.now() - tWorker;
      const totalMs = Date.now() - t0;

      const memAfter = await page.evaluate(() => {
        const p = performance as Performance & {
          memory?: { usedJSHeapSize: number };
        };
        return p.memory?.usedJSHeapSize ?? null;
      });

      const report = {
        profile: {
          size,
          chunkSize,
          chunkTotal,
          quotaMode: process.env.IMPORT_CHUNK_QUOTA || "job",
          workerChunksEnv: process.env.IMPORT_WORKER_CHUNKS || "(default)",
        },
        importId,
        createMs,
        stageMs,
        workerMs,
        totalMs,
        leadsPerSecTotal: +(size / (totalMs / 1000)).toFixed(1),
        leadsPerSecWorker: +(size / (workerMs / 1000)).toFixed(1),
        mongo: {
          roundTrips: mongoRoundTrips,
          bulkWrites,
          quotaChecks,
          emailFinds,
          reconciles,
        },
        workerTicks,
        chunksProcessed,
        status: final?.status,
        processedCount: final?.processedCount,
        successCount: final?.successCount,
        duplicateCount: final?.duplicateCount,
        errorCount: final?.errorCount,
        errorMessage: final?.errorMessage,
        heapBeforeMb:
          memBefore != null ? +(memBefore / 1024 / 1024).toFixed(1) : null,
        heapAfterMb:
          memAfter != null ? +(memAfter / 1024 / 1024).toFixed(1) : null,
        baseURL: test.info().project.use.baseURL,
      };
      console.log("\n=== HTTP soak report ===\n", JSON.stringify(report, null, 2));

      expect(final?.status).toBe("completed");
      expect(Number(final?.processedCount ?? 0)).toBeGreaterThanOrEqual(
        size * 0.99,
      );
    },
  );
});

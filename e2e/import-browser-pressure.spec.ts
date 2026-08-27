/**
 * Browser pressure: upload a large CSV on /dashboard/import and assert the
 * real job completes (API), not just that the progress bar disappears
 * (Fast Refresh remounts can hide progress without finishing the import).
 *
 * Opt-in:
 *   IMPORT_BROWSER_PRESSURE=1 IMPORT_BROWSER_ROWS=10000 npx playwright test e2e/import-browser-pressure.spec.ts
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";

const enabled = process.env.IMPORT_BROWSER_PRESSURE === "1";
const rows = Number(process.env.IMPORT_BROWSER_ROWS || 10_000);
/** Product max per upload. */
const MAX_ROWS = 50_000;

type ImportDoc = {
  _id?: string;
  status?: string;
  recordCount?: number;
  processedCount?: number;
  successCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  errorMessage?: string;
};

function writeCsv(filePath: string, n: number, stamp: number) {
  const header = "name,email,phone,country\n";
  const fd = fs.openSync(filePath, "w");
  fs.writeSync(fd, header);
  for (let i = 0; i < n; i++) {
    fs.writeSync(
      fd,
      `Pressure ${i},pressure.${stamp}.${i}@e2e.motherland.test,+1555${String(1000000 + i).slice(0, 7)},United States\n`,
    );
  }
  fs.closeSync(fd);
}

async function waitForImportTerminal(
  page: Parameters<typeof apiJson>[0],
  importId: string,
  timeoutMs: number,
): Promise<ImportDoc> {
  const deadline = Date.now() + timeoutMs;
  let last: ImportDoc | undefined;

  while (Date.now() < deadline) {
    // Nudge worker the same way the dashboard tab does
    await apiJson(page, "/api/imports/run", { method: "POST" }).catch(
      () => null,
    );

    const list = await apiJson(page, "/api/imports");
    const imports =
      (list.body as { imports?: ImportDoc[] })?.imports || [];
    const doc = imports.find((imp) => String(imp._id) === importId);
    if (doc) {
      last = doc;
      if (doc.status === "completed" || doc.status === "failed") {
        return doc;
      }
    }
    await page.waitForTimeout(750);
  }

  throw new Error(
    `Import ${importId} did not reach terminal status within ${timeoutMs}ms` +
      (last ? ` (last status=${last.status}, processed=${last.processedCount})` : ""),
  );
}

test.describe("import browser pressure", () => {
  test.skip(!enabled, "Set IMPORT_BROWSER_PRESSURE=1 to run");
  test.skip(
    rows > MAX_ROWS,
    `IMPORT_BROWSER_ROWS=${rows} exceeds product max ${MAX_ROWS} leads per upload`,
  );

  test(`UI survives ${rows}-row CSV upload`, async ({ page }) => {
    const jobTimeoutMs = Math.max(300_000, rows * 30);
    test.setTimeout(jobTimeoutMs + 120_000);

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await page.goto("/dashboard/import");

    const tmp = path.join(
      os.tmpdir(),
      `import-pressure-${rows}-${Date.now()}.csv`,
    );
    const stamp = Date.now();
    writeCsv(tmp, rows, stamp);

    const heapBefore = await page.evaluate(() => {
      const p = performance as Performance & {
        memory?: { usedJSHeapSize: number };
      };
      return p.memory?.usedJSHeapSize ?? null;
    });

    // Capture the import id from the create response (authoritative).
    const createResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/imports") &&
        res.request().method() === "POST" &&
        !res.url().includes("/stage") &&
        !res.url().includes("/run") &&
        !res.url().includes("/resume"),
      { timeout: 180_000 },
    );

    const t0 = Date.now();
    await page.locator("#file-upload").setInputFiles(tmp);

    const createRes = await createResponsePromise;
    expect([200, 202]).toContain(createRes.status());
    const createBody = (await createRes.json()) as {
      data?: { _id?: string };
    };
    const importId = String(createBody?.data?._id || "");
    expect(importId).toBeTruthy();

    // Progress UI should appear without locking the page forever
    await expect(page.getByTestId("import-job-progress")).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByText(/Before You Import/i)).toBeVisible();

    const final = await waitForImportTerminal(page, importId, jobTimeoutMs);
    const elapsedMs = Date.now() - t0;

    // UI should clear after real completion (best-effort; Fast Refresh may race)
    await expect(page.getByTestId("import-job-progress"))
      .toBeHidden({ timeout: 60_000 })
      .catch(() => null);

    const heapAfter = await page.evaluate(() => {
      const p = performance as Performance & {
        memory?: { usedJSHeapSize: number };
      };
      return p.memory?.usedJSHeapSize ?? null;
    });

    const processed = Number(final.processedCount ?? 0);
    const success = Number(final.successCount ?? 0);
    const duplicates = Number(final.duplicateCount ?? 0);
    const errors = Number(final.errorCount ?? 0);

    const report = {
      rows,
      importId,
      elapsedMs,
      status: final.status,
      processedCount: processed,
      successCount: success,
      duplicateCount: duplicates,
      errorCount: errors,
      errorMessage: final.errorMessage ?? null,
      heapBeforeMb:
        heapBefore != null ? +(heapBefore / 1024 / 1024).toFixed(1) : null,
      heapAfterMb:
        heapAfter != null ? +(heapAfter / 1024 / 1024).toFixed(1) : null,
      heapDeltaMb:
        heapBefore != null && heapAfter != null
          ? +((heapAfter - heapBefore) / 1024 / 1024).toFixed(1)
          : null,
    };
    console.log(
      "\n=== Browser pressure report ===\n",
      JSON.stringify(report, null, 2),
    );

    expect(final.status).toBe("completed");
    expect(processed).toBeGreaterThanOrEqual(Math.floor(rows * 0.99));
    // Unique stamp emails → almost all should insert (allow tiny error budget)
    expect(success + duplicates).toBeGreaterThanOrEqual(
      Math.floor(rows * 0.99),
    );

    if (report.heapAfterMb != null) {
      expect(report.heapAfterMb).toBeLessThan(1024);
    }

    fs.unlinkSync(tmp);
  });
});

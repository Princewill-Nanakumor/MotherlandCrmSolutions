/**
 * Same-tenant dual import: Import #1 processing ⇒ Import #2 stays queued
 * until #1 completes (then drains).
 *
 * Opt-in:
 *   IMPORT_HTTP_SAME_TENANT=1 npx playwright test e2e/import-http-same-tenant.spec.ts
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";

const enabled = process.env.IMPORT_HTTP_SAME_TENANT === "1";
const size = Number(process.env.IMPORT_SAME_TENANT_SIZE || 5_000);
const chunkSize = Math.max(
  100,
  Number(process.env.IMPORT_CLIENT_CHUNK_SIZE || 5_000),
);

function buildLeads(n: number, tag: string, stamp: number) {
  return Array.from({ length: n }, (_, i) => ({
    firstName: "Same",
    lastName: `${tag}${i}`,
    email: `same.${tag}.${stamp}.${i}@e2e.motherland.test`,
    phone: `+1555${String(1000000 + i).slice(0, 7)}`,
    country: "United States",
    status: "NEW",
    source: "http-same-tenant",
  }));
}

async function createAndStage(
  page: Parameters<typeof apiJson>[0],
  tag: string,
  stamp: number,
) {
  const leads = buildLeads(size, tag, stamp);
  const chunkTotal = Math.ceil(leads.length / chunkSize);
  const created = await apiJson(page, "/api/imports", {
    method: "POST",
    body: JSON.stringify({
      fileName: `same-tenant-${tag}.csv`,
      recordCount: size,
      timestamp: Date.now(),
    }),
  });
  expect([200, 202]).toContain(created.status);
  const importId = String(
    (created.body as { data?: { _id?: string } })?.data?._id || "",
  );
  expect(importId).toBeTruthy();

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
  return importId;
}

async function readImport(
  page: Parameters<typeof apiJson>[0],
  importId: string,
) {
  const list = await apiJson(page, "/api/imports");
  const imports =
    (list.body as { imports?: Array<Record<string, unknown>> })?.imports || [];
  return imports.find((imp) => String(imp._id) === importId) as
    | { status?: string; processedCount?: number }
    | undefined;
}

test.describe("import HTTP same-tenant queue", () => {
  test.skip(!enabled, "Set IMPORT_HTTP_SAME_TENANT=1 to run");

  test("second import waits while first processes", async ({ page }) => {
    test.setTimeout(Math.max(300_000, size * 40));
    // Disable stage auto-kick so we control claim order
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    const session = await apiJson(page, "/api/auth/session");
    expect(
      (session.body as { user?: { role?: string } })?.user?.role,
    ).toBe("ADMIN");

    const stamp = Date.now();
    const firstId = await createAndStage(page, "one", stamp);
    const secondId = await createAndStage(page, "two", stamp);

    // One worker tick should claim the older job only
    await apiJson(page, "/api/imports/run", { method: "POST" });
    await page.waitForTimeout(1000);

    let first = await readImport(page, firstId);
    let second = await readImport(page, secondId);

    // First should be processing (or already completed if tiny/fast)
    expect(["processing", "completed", "queued"]).toContain(first?.status);
    if (first?.status === "processing") {
      expect(second?.status).toBe("queued");
    }

    // Drain until both complete
    for (let i = 0; i < 600; i++) {
      await apiJson(page, "/api/imports/run", { method: "POST" });
      first = await readImport(page, firstId);
      second = await readImport(page, secondId);
      if (first?.status === "completed" && second?.status === "completed") break;
      // While first still active, second must not be processing in parallel
      if (first?.status === "processing") {
        expect(second?.status).not.toBe("processing");
      }
      await page.waitForTimeout(400);
    }

    expect(first?.status).toBe("completed");
    expect(second?.status).toBe("completed");
    console.log(
      "\n=== Same-tenant queue report ===\n",
      JSON.stringify(
        {
          size,
          firstId,
          secondId,
          firstProcessed: first?.processedCount,
          secondProcessed: second?.processedCount,
        },
        null,
        2,
      ),
    );
  });
});

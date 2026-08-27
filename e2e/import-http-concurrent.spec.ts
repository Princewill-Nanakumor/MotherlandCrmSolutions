/**
 * Concurrent HTTP import soak across multiple tenants (real stage → worker path).
 *
 * Opt-in (long / needs Mongo):
 *   IMPORT_HTTP_CONCURRENT=1 npx playwright test e2e/import-http-concurrent.spec.ts
 *
 * Defaults: 5 tenants × 50k (product max). Override:
 *   IMPORT_CONCURRENT_TENANTS=5 IMPORT_CONCURRENT_SIZE=50000
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";

const enabled = process.env.IMPORT_HTTP_CONCURRENT === "1";
const tenantCount = Math.min(
  10,
  Math.max(1, Number(process.env.IMPORT_CONCURRENT_TENANTS || 5)),
);
const size = Number(process.env.IMPORT_CONCURRENT_SIZE || 50_000);
const chunkSize = Math.max(
  100,
  Number(process.env.IMPORT_CLIENT_CHUNK_SIZE || 5_000),
);
const MAX = 50_000;

const LABELS = "ABCDEFGHIJ".slice(0, tenantCount).split("");

/** Concurrent tenants are seeded as ADMIN only (agents cannot import). */
function emailFor(label: string) {
  return `e2e-admin-${label.toLowerCase()}@motherland.test`;
}

function buildLeads(n: number, tenant: string, stamp: number) {
  return Array.from({ length: n }, (_, i) => ({
    firstName: "Conc",
    lastName: `${tenant}${i}`,
    email: `conc.${tenant.toLowerCase()}.${stamp}.${i}@e2e.motherland.test`,
    phone: `+1555${String(1000000 + i).slice(0, 7)}`,
    country: "United States",
    status: "NEW",
    source: "http-concurrent",
  }));
}

test.describe.configure({ mode: "serial" });

test.describe("import HTTP concurrent multi-tenant", () => {
  test.skip(!enabled, "Set IMPORT_HTTP_CONCURRENT=1 to run");
  test.skip(size > MAX, `IMPORT_CONCURRENT_SIZE exceeds ${MAX}`);

  test(`${tenantCount} tenants × ${size} via stage+worker`, async ({
    browser,
  }) => {
    test.setTimeout(Math.max(600_000, size * tenantCount * 15));

    const stamp = Date.now();
    const t0 = Date.now();

    const results = await Promise.all(
      LABELS.map(async (label) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        try {
          await loginAs(page, emailFor(label), E2E_PASSWORD);
          // Import APIs are ADMIN-only
          const session = await apiJson(page, "/api/auth/session");
          expect(
            (session.body as { user?: { role?: string } })?.user?.role,
          ).toBe("ADMIN");

          const leads = buildLeads(size, label, stamp);
          const chunkTotal = Math.ceil(leads.length / chunkSize);

          const created = await apiJson(page, "/api/imports", {
            method: "POST",
            body: JSON.stringify({
              fileName: `concurrent-${label}-${size}.csv`,
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
            const staged = await apiJson(
              page,
              `/api/imports/${importId}/stage`,
              {
                method: "POST",
                body: JSON.stringify({
                  leads: slice.map((l) => ({ ...l, importId })),
                  chunkIndex: c,
                  chunkTotal,
                  isLast: c === chunkTotal - 1,
                }),
              },
            );
            expect([200, 202]).toContain(staged.status);
          }

          let final:
            | {
                status?: string;
                processedCount?: number;
                successCount?: number;
                adminId?: string;
              }
            | undefined;

          for (let i = 0; i < 900; i++) {
            await apiJson(page, "/api/imports/run", { method: "POST" });
            const list = await apiJson(page, "/api/imports");
            const imports =
              (list.body as { imports?: Array<Record<string, unknown>> })
                ?.imports || [];
            const doc = imports.find((imp) => String(imp._id) === importId);
            if (doc) {
              final = doc as typeof final;
              if (doc.status === "completed" || doc.status === "failed") break;
            }
            await page.waitForTimeout(500);
          }

          return {
            label,
            importId,
            status: final?.status,
            processedCount: Number(final?.processedCount ?? 0),
            successCount: Number(final?.successCount ?? 0),
            adminId: String(final?.adminId || ""),
          };
        } finally {
          await context.close();
        }
      }),
    );

    const totalMs = Date.now() - t0;
    const report = {
      tenants: tenantCount,
      size,
      totalMs,
      leadsPerSecAggregate: +(
        (size * tenantCount) /
        (totalMs / 1000)
      ).toFixed(1),
      results,
    };
    console.log(
      "\n=== HTTP concurrent multi-tenant report ===\n",
      JSON.stringify(report, null, 2),
    );

    for (const r of results) {
      expect(r.status).toBe("completed");
      expect(r.processedCount).toBeGreaterThanOrEqual(size * 0.99);
    }
    // Isolation: each import belongs to a distinct admin when adminId present
    const admins = results.map((r) => r.adminId).filter(Boolean);
    if (admins.length === results.length) {
      expect(new Set(admins).size).toBe(results.length);
    }
  });
});

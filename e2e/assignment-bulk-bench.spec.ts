/**
 * Times All Leads bulk ops through the real HTTP APIs:
 *   assign → reassign → bulk status → unassign
 *
 * Cap is MAX_ASSIGNED_LEADS_PER_AGENT (500). Default size 500; use 200 for a quicker pass.
 *
 *   npm run test:assign-bulk-bench          # 500
 *   npm run test:assign-bulk-bench:200      # 200
 *   ASSIGN_BULK_BENCH=1 ASSIGN_BENCH_SIZE=350 npx playwright test e2e/assignment-bulk-bench.spec.ts
 *
 * Needs .env MONGODB_URI + running Next (Playwright webServer or your npm run dev).
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_AGENT_B_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";
import { importLeadsWithRetry } from "./helpers/assignmentUi";

const enabled = process.env.ASSIGN_BULK_BENCH === "1";
const MAX_ASSIGNED = 500;
const size = Math.min(
  MAX_ASSIGNED,
  Math.max(1, Number(process.env.ASSIGN_BENCH_SIZE || 500)),
);

type UserRow = {
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
};

type LeadRow = {
  _id: string;
  email?: string;
  assignedTo?: unknown;
  status?: string;
};

function rate(n: number, ms: number) {
  return ms > 0 ? +(n / (ms / 1000)).toFixed(1) : 0;
}

function userId(u: UserRow | undefined): string {
  return String(u?.id || u?._id || "");
}

async function listUsers(page: import("@playwright/test").Page) {
  const res = await apiJson(page, "/api/users");
  expect(res.status).toBe(200);
  const body = res.body as UserRow[] | { users?: UserRow[] };
  return Array.isArray(body) ? body : body.users || [];
}

async function fetchBenchLeadIds(
  page: import("@playwright/test").Page,
  stamp: number,
  expected: number,
) {
  const search = `assign.bench.${stamp}`;
  const pageSize = Math.min(500, Math.max(100, expected));
  const deadline = Date.now() + 60_000;
  let lastCount = 0;

  while (Date.now() < deadline) {
    const ids: string[] = [];
    let pageNum = 1;
    while (ids.length < expected && pageNum <= 20) {
      const list = await apiJson(
        page,
        `/api/leads/all?search=${encodeURIComponent(search)}&page=${pageNum}&pageSize=${pageSize}`,
      );
      expect(list.status).toBe(200);
      const leads = (list.body as { leads?: LeadRow[] }).leads || [];
      for (const lead of leads) {
        if (lead.email?.includes(`assign.bench.${stamp}.`)) {
          ids.push(lead._id);
        }
      }
      if (leads.length < pageSize) break;
      pageNum += 1;
    }
    const unique = [...new Set(ids)];
    lastCount = unique.length;
    if (unique.length >= expected * 0.99) return unique;
    await page.waitForTimeout(750);
  }

  throw new Error(
    `Timed out waiting for bench leads (search=${search}); found ${lastCount}/${expected}`,
  );
}

test.describe.configure({ mode: "serial" });

test.describe("assignment bulk bench (All Leads APIs)", () => {
  test.skip(!enabled, "Set ASSIGN_BULK_BENCH=1 to run");
  test.skip(
    size > MAX_ASSIGNED,
    `ASSIGN_BENCH_SIZE=${size} exceeds agent assignment cap ${MAX_ASSIGNED}`,
  );

  test(`assign → reassign → bulk status → unassign for ${size} leads`, async ({
    page,
  }) => {
    test.setTimeout(Math.max(300_000, size * 80));

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const users = await listUsers(page);
    const agentA = users.find((u) => u.email === E2E_AGENT_EMAIL);
    const agentB = users.find((u) => u.email === E2E_AGENT_B_EMAIL);
    expect(
      agentA,
      `missing ${E2E_AGENT_EMAIL} — run npm run test:e2e:seed`,
    ).toBeTruthy();
    expect(
      agentB,
      `missing ${E2E_AGENT_B_EMAIL} — re-run npm run test:e2e:seed`,
    ).toBeTruthy();
    const agentAId = userId(agentA);
    const agentBId = userId(agentB);
    expect(agentAId).toBeTruthy();
    expect(agentBId).toBeTruthy();
    expect(agentAId).not.toBe(agentBId);

    const stamp = Date.now();
    const importPayload = Array.from({ length: size }, (_, i) => ({
      name: `Assign Bench ${i}`,
      email: `assign.bench.${stamp}.${i}@e2e.motherland.test`,
      phone: `+1555${String(2000000 + i).slice(0, 7)}`,
      source: "assign-bulk-bench",
      country: "United States",
    }));

    const tSeed = Date.now();
    const imported = await importLeadsWithRetry(page, importPayload);
    expect(
      imported.status,
      `import failed after ${imported.attempts} attempt(s): ${JSON.stringify(imported.body)}`,
    ).toBe(200);
    const seedMs = Date.now() - tSeed;
    const importBody = imported.body as {
      successCount?: number;
      skippedDuplicates?: number;
      message?: string;
    };
    expect(
      importBody.successCount ?? 0,
      `import body: ${JSON.stringify(importBody)}`,
    ).toBeGreaterThanOrEqual(size * 0.99);

    const leadIds = await fetchBenchLeadIds(page, stamp, size);
    expect(leadIds.length).toBeGreaterThanOrEqual(size * 0.99);
    const n = leadIds.length;

    // 1) Assign (unassigned → agent A)
    const tAssign = Date.now();
    const assign = await apiJson(page, "/api/leads/assign", {
      method: "POST",
      body: JSON.stringify({ leadIds, userId: agentAId }),
    });
    const assignMs = Date.now() - tAssign;
    expect(assign.status).toBe(200);
    const assignBody = assign.body as {
      success?: boolean;
      modifiedCount?: number;
    };
    expect(assignBody.success).toBe(true);

    // 2) Reassign (agent A → agent B) — same assign API
    const tReassign = Date.now();
    const reassign = await apiJson(page, "/api/leads/assign", {
      method: "POST",
      body: JSON.stringify({ leadIds, userId: agentBId }),
    });
    const reassignMs = Date.now() - tReassign;
    expect(reassign.status).toBe(200);
    expect((reassign.body as { success?: boolean }).success).toBe(true);

    // 3) Bulk status change
    const tStatus = Date.now();
    const status = await apiJson(page, "/api/leads/bulk/status", {
      method: "POST",
      body: JSON.stringify({ leadIds, status: "CONTACTED" }),
    });
    const statusMs = Date.now() - tStatus;
    expect(
      status.status,
      `bulk status failed: ${JSON.stringify(status.body)}`,
    ).toBe(200);
    expect((status.body as { success?: boolean }).success).toBe(true);

    // 4) Unassign
    const tUnassign = Date.now();
    const unassign = await apiJson(page, "/api/leads/unassign", {
      method: "POST",
      body: JSON.stringify({ leadIds }),
    });
    const unassignMs = Date.now() - tUnassign;
    expect(unassign.status).toBe(200);
    expect((unassign.body as { success?: boolean }).success).toBe(true);

    const totalOpsMs = assignMs + reassignMs + statusMs + unassignMs;
    const report = {
      size: n,
      maxAssignedCap: MAX_ASSIGNED,
      seedImportMs: seedMs,
      assignMs,
      assignLeadsPerSec: rate(n, assignMs),
      reassignMs,
      reassignLeadsPerSec: rate(n, reassignMs),
      bulkStatusMs: statusMs,
      bulkStatusLeadsPerSec: rate(n, statusMs),
      unassignMs,
      unassignLeadsPerSec: rate(n, unassignMs),
      totalOpsMs,
      ablyCallsPerOp: 1,
      assignBody: {
        modifiedCount: assignBody.modifiedCount,
      },
      reassignBody: {
        modifiedCount: (reassign.body as { modifiedCount?: number })
          .modifiedCount,
      },
      statusBody: {
        updatedCount: (status.body as { updatedCount?: number }).updatedCount,
      },
      unassignBody: {
        unassignedCount: (unassign.body as { unassignedCount?: number })
          .unassignedCount,
      },
      baseURL: test.info().project.use.baseURL,
    };
    console.log(
      "\n=== Assignment bulk bench report ===\n",
      JSON.stringify(report, null, 2),
    );
  });
});

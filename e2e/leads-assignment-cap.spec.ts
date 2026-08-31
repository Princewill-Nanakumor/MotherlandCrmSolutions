/**
 * Proves the 500-leads-per-agent assignment cap is enforced end-to-end.
 *
 *   npm run test:leads-assignment-cap
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";
import { importLeadsWithRetry } from "./helpers/assignmentUi";

const MAX_ASSIGNED_LEADS_PER_AGENT = 500;

const enabled = process.env.LEADS_ASSIGNMENT_CAP === "1";
const extra = Number(process.env.LEADS_ASSIGNMENT_CAP_EXTRA || 10);

test.describe("agent assignment cap (500)", () => {
  test.skip(!enabled, "Set LEADS_ASSIGNMENT_CAP=1 to run");

  test(`assign ${MAX_ASSIGNED_LEADS_PER_AGENT} ok, ${MAX_ASSIGNED_LEADS_PER_AGENT + 1} rejected`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(600_000);

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const usersRes = await apiJson(page, "/api/users");
    expect(usersRes.status).toBe(200);
    const users = (usersRes.body as { email?: string; id?: string; _id?: string }[]) || [];
    const agent = users.find((u) => u.email === E2E_AGENT_EMAIL);
    expect(agent).toBeTruthy();
    const agentId = String(agent?.id || agent?._id);

    const total = MAX_ASSIGNED_LEADS_PER_AGENT + extra;
    const stamp = Date.now();
    const payload = Array.from({ length: total }, (_, i) => ({
      name: `Cap Bench ${i}`,
      email: `cap.bench.${stamp}.${i}@e2e.motherland.test`,
      phone: `+1555${String(5000000 + i).slice(0, 7)}`,
      source: "assignment-cap-bench",
      country: "United States",
    }));

    const imported = await importLeadsWithRetry(page, payload);
    expect(imported.status).toBe(200);

    const search = `cap.bench.${stamp}`;
    const leadIds: string[] = [];
    const pageSize = 500;
    for (let pageNum = 1; leadIds.length < total && pageNum <= 5; pageNum++) {
      const list = await apiJson(
        page,
        `/api/leads/all?search=${encodeURIComponent(search)}&page=${pageNum}&pageSize=${pageSize}`,
      );
      expect(list.status).toBe(200);
      const rows = (list.body as { leads?: { _id: string }[] }).leads || [];
      for (const row of rows) {
        if (row._id) leadIds.push(row._id);
      }
      if (rows.length < pageSize) break;
    }
    expect(leadIds.length).toBeGreaterThanOrEqual(MAX_ASSIGNED_LEADS_PER_AGENT);

    const firstBatch = leadIds.slice(0, MAX_ASSIGNED_LEADS_PER_AGENT);
    const overflowId = leadIds[MAX_ASSIGNED_LEADS_PER_AGENT];
    expect(overflowId, "need one extra lead beyond the cap").toBeTruthy();

    const assign500 = await apiJson(page, "/api/leads/assign", {
      method: "POST",
      body: JSON.stringify({ leadIds: firstBatch, userId: agentId }),
    });
    expect(assign500.status).toBe(200);

    const assignOneMore = await apiJson(page, "/api/leads/assign", {
      method: "POST",
      body: JSON.stringify({ leadIds: [overflowId], userId: agentId }),
    });
    expect(assignOneMore.status).toBe(400);
    const capBody = assignOneMore.body as { message?: string };
    expect(capBody.message || "").toMatch(/maximum 500|at most 0 more/i);

    const agentPage = await browser.newPage();
    await loginAs(agentPage, E2E_AGENT_EMAIL, E2E_PASSWORD);
    const assigned = await apiJson(agentPage, "/api/leads/assigned");
    expect(assigned.status).toBe(200);
    const assignedRows = Array.isArray(assigned.body)
      ? assigned.body
      : (assigned.body as { assignedLeads?: unknown[] }).assignedLeads || [];
    expect(assignedRows.length).toBe(MAX_ASSIGNED_LEADS_PER_AGENT);
    await agentPage.close();

    // eslint-disable-next-line no-console -- bench report
    console.log("\n=== Assignment cap report ===\n", {
      cap: MAX_ASSIGNED_LEADS_PER_AGENT,
      seeded: leadIds.length,
      assignedApiCount: assignedRows.length,
      overflowRejected: assignOneMore.status,
    });
  });
});

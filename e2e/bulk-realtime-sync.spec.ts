/**
 * Two-browser bulk realtime: admin channel drives list + open panel + agent view.
 *
 *   BULK_REALTIME_SYNC=1 npx playwright test e2e/bulk-realtime-sync.spec.ts
 *
 * Requires ABLY_API_KEY in .env (realtime). Skipped when unset.
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

const enabled = process.env.BULK_REALTIME_SYNC === "1";
const hasAbly = Boolean(process.env.ABLY_API_KEY?.trim());

test.describe.configure({ mode: "serial" });

test.describe("bulk realtime sync (two browsers)", () => {
  test.skip(!enabled, "Set BULK_REALTIME_SYNC=1 to run");
  test.skip(
    !hasAbly,
    "ABLY_API_KEY is missing in .env — uncomment/set it for realtime sync tests",
  );

  test("admin list, agent list, and open panel update after bulk assign", async ({
    browser,
  }) => {
    test.setTimeout(300_000);

    const stamp = Date.now();
    const search = `realtime.bulk.${stamp}`;
    const leadEmails = Array.from(
      { length: 5 },
      (_, i) => `${search}.${i}@e2e.motherland.test`,
    );
    const panelEmail = leadEmails[0];

    const adminA = await browser.newContext();
    const adminB = await browser.newContext();
    const agentCtx = await browser.newContext();
    const adminPageA = await adminA.newPage();
    const adminPageB = await adminB.newPage();
    const agentPage = await agentCtx.newPage();

    try {
      await loginAs(adminPageA, E2E_ADMIN_EMAIL, E2E_PASSWORD);

      const imported = await importLeadsWithRetry(
        adminPageA,
        leadEmails.map((email, i) => ({
          name: `Realtime Bulk ${i}`,
          email,
          phone: `+1555${String(7000000 + i).slice(0, 7)}`,
          source: "bulk-realtime-sync",
          country: "United States",
        })),
      );
      expect(
        imported.status,
        `import failed: ${JSON.stringify(imported.body)}`,
      ).toBe(200);

      const users = await apiJson(adminPageA, "/api/users");
      const userList = Array.isArray(users.body)
        ? (users.body as Array<{ id?: string; _id?: string; email?: string }>)
        : (users.body as { users?: Array<{ id?: string; _id?: string; email?: string }> })
            .users ?? [];
      const agentA = userList.find((u) => u.email === E2E_AGENT_EMAIL);
      const agentB = userList.find((u) => u.email === E2E_AGENT_B_EMAIL);
      const agentAId = String(agentA?.id || agentA?._id || "");
      const agentBId = String(agentB?.id || agentB?._id || "");
      expect(agentAId).toBeTruthy();
      expect(agentBId).toBeTruthy();

      const list = await apiJson(
        adminPageA,
        `/api/leads/all?search=${encodeURIComponent(search)}&pageSize=10`,
      );
      const leads =
        (list.body as { leads?: Array<{ _id: string; email: string }> }).leads ??
        [];
      expect(leads.length).toBeGreaterThanOrEqual(5);
      const leadIds = leads.map((l) => l._id);
      const panelLeadId = leads.find((l) => l.email === panelEmail)!._id;

      await loginAs(adminPageB, E2E_ADMIN_EMAIL, E2E_PASSWORD);
      await loginAs(agentPage, E2E_AGENT_EMAIL, E2E_PASSWORD);

      await adminPageA.goto(
        `/dashboard/all-leads?search=${encodeURIComponent(panelEmail)}`,
      );
      await expect(adminPageA.getByText(panelEmail).first()).toBeVisible({
        timeout: 60_000,
      });
      await adminPageA.getByText(panelEmail).first().click();
      await expect(
        adminPageA.getByRole("heading", { name: /lead details|details/i }),
      ).toBeVisible({ timeout: 30_000 }).catch(() => undefined);
      await expect(adminPageA.getByText("Unassigned").first()).toBeVisible({
        timeout: 30_000,
      });

      await adminPageB.goto(
        `/dashboard/all-leads?search=${encodeURIComponent(search)}`,
      );
      await expect(adminPageB.getByText(search).first()).toBeVisible({
        timeout: 60_000,
      });

      await agentPage.goto("/dashboard/leads");
      await expect(agentPage.getByText(search).first()).not.toBeVisible({
        timeout: 15_000,
      }).catch(() => undefined);

      await adminPageB.waitForTimeout(4000);

      const assign = await apiJson(adminPageB, "/api/leads/assign", {
        method: "POST",
        body: JSON.stringify({ leadIds, userId: agentAId }),
      });
      expect(assign.status).toBe(200);

      await expect(
        adminPageB.locator("tbody tr").first().getByText("E2E Agent"),
      ).toBeVisible({ timeout: 60_000 });

      await expect(
        adminPageA.locator("tbody tr").first().getByText("E2E Agent"),
      ).toBeVisible({ timeout: 60_000 });

      await expect(agentPage.getByText(panelEmail).first()).toBeVisible({
        timeout: 90_000,
      });

      const reassign = await apiJson(adminPageB, "/api/leads/assign", {
        method: "POST",
        body: JSON.stringify({ leadIds, userId: agentBId }),
      });
      expect(reassign.status).toBe(200);

      await expect(
        adminPageA.locator("tbody tr").first().getByText("E2E AgentB"),
      ).toBeVisible({ timeout: 90_000 });

      await expect(agentPage.getByText(panelEmail).first()).not.toBeVisible({
        timeout: 90_000,
      }).catch(() => undefined);

      await expect(agentPage.getByText(search).first()).not.toBeVisible({
        timeout: 30_000,
      }).catch(() => undefined);
    } finally {
      await adminA.close();
      await adminB.close();
      await agentCtx.close();
    }
  });
});

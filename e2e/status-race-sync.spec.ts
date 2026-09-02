/**
 * Race: agent changes status before admin realtime catches up; admin picks the
 * same status the server already has → idempotent 200, UI sync, no duplicate activity.
 *
 *   STATUS_RACE_E2E=1 npx playwright test e2e/status-race-sync.spec.ts
 *
 * Requires MONGODB_URI + e2e users (npm run test:e2e:seed). ABLY_API_KEY optional
 * (used only to assert agent list received the first realtime update).
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAsFast,
} from "./helpers/auth";
import {
  gotoAllLeadsForBench,
  openLeadDetailPanelOnly,
  selectLeadStatusInPanel,
} from "./helpers/leadDetailPanelUi";
import { listStatuses, statusId } from "./helpers/assignmentUi";
import {
  blockAblyOnContext,
  countStatusChangeActivities,
  expectNoStatusErrorToast,
  expectPanelStatusLabel,
  expectStatusRaceToast,
  fetchLeadStatusRaw,
  leadDetailLoadedPromise,
} from "./helpers/statusRaceUi";

const enabled = process.env.STATUS_RACE_E2E === "1";
const hasAbly = Boolean(process.env.ABLY_API_KEY?.trim());

test.describe("status change race (agent then admin)", () => {
  test.skip(!enabled, "Set STATUS_RACE_E2E=1 to run");
  test.skip(!process.env.MONGODB_URI, "MONGODB_URI required for seeded e2e data");

  test("admin idempotent status sync when UI is behind agent", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const leadEmail = `status.race.${stamp}@e2e.motherland.test`;

    const adminContext = await browser.newContext();
    await blockAblyOnContext(adminContext);
    const agentContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const agentPage = await agentContext.newPage();

    try {
      await loginAsFast(adminPage, E2E_ADMIN_EMAIL, E2E_PASSWORD);
      await adminPage.goto("/dashboard", { waitUntil: "domcontentloaded" });

      const imported = await apiJson(adminPage, "/api/leads/import", {
        method: "POST",
        body: JSON.stringify([
          {
            name: `Status Race ${stamp}`,
            email: leadEmail,
            phone: "+15559870123",
            source: "status-race-sync",
            country: "United States",
          },
        ]),
      });
      expect(imported.status).toBe(200);

      const list = await apiJson(
        adminPage,
        `/api/leads/all?search=${encodeURIComponent(leadEmail)}&pageSize=10`,
      );
      expect(list.status).toBe(200);
      const lead = (list.body as { leads: Array<{ _id: string }> }).leads?.[0];
      expect(lead?._id).toBeTruthy();
      const leadId = lead!._id;

      const users = await apiJson(adminPage, "/api/users");
      const userList = Array.isArray(users.body)
        ? (users.body as Array<{ id?: string; _id?: string; email: string }>)
        : (
            users.body as {
              users?: Array<{ id?: string; _id?: string; email: string }>;
            }
          ).users ?? [];
      const agent = userList.find((u) => u.email === E2E_AGENT_EMAIL);
      const agentUserId = String(agent?.id || agent?._id || "");
      expect(agentUserId).toBeTruthy();

      const assign = await apiJson(adminPage, `/api/leads/${leadId}/assign`, {
        method: "POST",
        body: JSON.stringify({ userId: agentUserId }),
      });
      expect([200, 201]).toContain(assign.status);

      const targetStatusName = `E2E Race Status ${stamp}`;
      const createdStatus = await apiJson(adminPage, "/api/statuses", {
        method: "POST",
        body: JSON.stringify({ name: targetStatusName, color: "#336699" }),
      });
      expect([200, 201]).toContain(createdStatus.status);

      const statuses = await listStatuses(adminPage);
      const targetStatus = statuses.find((s) => s.name === targetStatusName);
      expect(targetStatus, `created status ${targetStatusName}`).toBeTruthy();
      const targetName = targetStatus!.name;
      const targetKey = statusId(targetStatus!);

      await gotoAllLeadsForBench(adminPage);
      const leadDetailLoaded = leadDetailLoadedPromise(adminPage, leadId);
      await openLeadDetailPanelOnly(adminPage, leadEmail, {
        searchDebounceMs: 0,
      });
      await leadDetailLoaded;
      await expectPanelStatusLabel(adminPage, "New");

      await loginAsFast(agentPage, E2E_AGENT_EMAIL, E2E_PASSWORD);
      await agentPage.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });

      if (hasAbly) {
        await expect(agentPage.getByText(leadEmail).first()).toBeVisible({
          timeout: 30_000,
        });
        await agentPage.waitForTimeout(2_000);
      }

      const agentPatch = await apiJson(agentPage, `/api/leads/${leadId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetKey }),
      });
      expect(agentPatch.status).toBe(200);
      expect(
        (agentPatch.body as { statusChanged?: boolean }).statusChanged,
      ).not.toBe(false);

      const serverStatus = await fetchLeadStatusRaw(adminPage, leadId);
      expect(serverStatus).toBe(targetKey);

      if (hasAbly) {
        const agentRow = agentPage.locator("tr", { hasText: leadEmail });
        await expect(
          agentRow.getByTitle(new RegExp(targetName, "i")),
        ).toBeVisible({
          timeout: 45_000,
        });
      }

      expect(await countStatusChangeActivities(adminPage, leadId)).toBe(1);

      await expectPanelStatusLabel(adminPage, "New");

      const statusPatchPromise = adminPage.waitForResponse(
        (res) =>
          res.request().method() === "PATCH" &&
          res.url().includes(`/api/leads/${leadId}/status`),
      );

      await selectLeadStatusInPanel(adminPage, targetName);

      const statusPatch = await statusPatchPromise;
      expect(statusPatch.status()).toBe(200);
      const patchBody = (await statusPatch.json()) as {
        status?: string;
        statusChanged?: boolean;
      };
      expect(patchBody.statusChanged).toBe(false);

      await expectStatusRaceToast(adminPage);
      await expectNoStatusErrorToast(adminPage);
      await expectPanelStatusLabel(adminPage, targetName);

      expect(await countStatusChangeActivities(adminPage, leadId)).toBe(1);
      expect(await fetchLeadStatusRaw(adminPage, leadId)).toBe(serverStatus);
    } finally {
      await adminContext.close();
      await agentContext.close();
    }
  });
});

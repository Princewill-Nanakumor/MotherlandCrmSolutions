/**
 * UI reminder flow: create → timeline log → complete → delete, without a page refresh.
 *
 *   npm run test:e2e:seed
 *   npm run test:reminder-flow
 *
 *   REMINDER_FLOW_E2E=1 npx playwright test e2e/reminder-flow.spec.ts
 *
 * Needs MONGODB_URI and seeded e2e-admin (same as lead lifecycle).
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAsFast,
} from "./helpers/auth";
import {
  addReminderInPanel,
  completeReminderInPanel,
  deleteReminderInPanel,
  gotoAllLeadsForBench,
  openLeadDetailPanelOnly,
  switchToCommentsTab,
  switchToRemindersTab,
} from "./helpers/leadDetailPanelUi";

const enabled = process.env.REMINDER_FLOW_E2E === "1";

test.describe("reminder panel flow", () => {
  test.skip(!enabled, "Set REMINDER_FLOW_E2E=1 to run");
  test.skip(!process.env.MONGODB_URI, "MONGODB_URI required for seeded e2e data");

  test("create, log, complete, and delete a reminder without refresh", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const leadEmail = `reminder.flow.${stamp}@e2e.motherland.test`;
    const reminderTitle = `E2E reminder ${stamp}`;

    await loginAsFast(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const imported = await apiJson(page, "/api/leads/import", {
      method: "POST",
      body: JSON.stringify([
        {
          name: `Reminder Flow ${stamp}`,
          email: leadEmail,
          phone: "+15557654321",
          source: "reminder-flow-e2e",
          country: "United States",
        },
      ]),
    });
    expect(imported.status).toBe(200);

    await gotoAllLeadsForBench(page);
    const panel = await openLeadDetailPanelOnly(page, leadEmail);

    await addReminderInPanel(page, reminderTitle);
    await expect(panel.getByRole("button", { name: /^Reminders/i })).toContainText(
      "1",
    );

    await switchToCommentsTab(page);
    await expect(panel.getByText("created reminder").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText("Unknown User")).toHaveCount(0);
    await expect(panel.getByText(/E2E Admin/i).first()).toBeVisible();
    await expect(panel.getByText(reminderTitle).first()).toBeVisible();

    await switchToRemindersTab(page);
    await completeReminderInPanel(page, reminderTitle);
    await expect(panel.getByRole("button", { name: /^Reminders/i })).not.toContainText(
      "1",
    );

    await switchToCommentsTab(page);
    await expect(panel.getByText("completed reminder").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText("Unknown User")).toHaveCount(0);

    await switchToRemindersTab(page);
    await deleteReminderInPanel(page, reminderTitle);
    await expect(panel.getByText("No Reminders Set")).toBeVisible({
      timeout: 15_000,
    });
    await expect(panel.getByRole("button", { name: /^Reminders$/i })).toBeVisible();

    await switchToCommentsTab(page);
    await expect(panel.getByText("deleted reminder").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(panel.getByText("Unknown User")).toHaveCount(0);
  });
});

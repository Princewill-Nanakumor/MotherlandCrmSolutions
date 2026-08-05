import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";

/**
 * Seeded lead lifecycle (hybrid UI + authenticated API).
 * Proves the product path end-to-end against a real Mongo + Ably stack.
 */
test.describe.configure({ mode: "serial" });

test.describe("seeded lead lifecycle", () => {
  const stamp = Date.now();
  const leadEmail = `lifecycle.${stamp}@e2e.motherland.test`;
  const commentText = `E2E comment ${stamp}`;
  let leadId = "";
  let agentId = "";

  test("admin logs in, imports lead, assigns agent", async ({ page }) => {
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const imported = await apiJson(page, "/api/leads/import", {
      method: "POST",
      body: JSON.stringify([
        {
          name: `Lifecycle Lead ${stamp}`,
          email: leadEmail,
          phone: "+15551230987",
          source: "e2e",
          country: "United States",
        },
      ]),
    });
    expect(imported.status).toBe(200);

    await page.goto("/dashboard/all-leads");
    const search = page.getByPlaceholder(/search/i).first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill(leadEmail);
    }
    await expect(page.getByText(leadEmail).first()).toBeVisible({
      timeout: 30_000,
    });

    const list = await apiJson(
      page,
      `/api/leads/all?search=${encodeURIComponent(leadEmail)}&pageSize=25`,
    );
    expect(list.status).toBe(200);
    const leads = (
      list.body as { leads?: Array<{ _id: string; email: string }> }
    ).leads;
    const lead = leads?.find((l) => l.email === leadEmail);
    expect(lead).toBeTruthy();
    leadId = lead!._id;

    const users = await apiJson(page, "/api/users");
    expect(users.status).toBe(200);
    const agents = Array.isArray(users.body)
      ? (users.body as Array<{ _id: string; email: string; role: string }>)
      : (
          users.body as {
            users?: Array<{ _id: string; email: string; role: string }>;
          }
        ).users;
    const agent = agents?.find((u) => u.email === E2E_AGENT_EMAIL) as
      | { id?: string; _id?: string; email: string }
      | undefined;
    expect(agent).toBeTruthy();
    agentId = agent!.id || agent!._id || "";
    expect(agentId).toBeTruthy();

    const assign = await apiJson(page, `/api/leads/${leadId}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId: agentId }),
    });
    expect([200, 201]).toContain(assign.status);
  });

  test("agent logs in, changes status, leaves comment + reminder", async ({
    page,
  }) => {
    expect(leadId).toBeTruthy();
    await loginAs(page, E2E_AGENT_EMAIL, E2E_PASSWORD);

    await page.goto(`/dashboard/leads/${leadId}`);
    await expect(page.getByText(leadEmail).first()).toBeVisible({
      timeout: 30_000,
    });

    const status = await apiJson(page, `/api/leads/${leadId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    expect(status.status).toBe(200);

    await page.goto(`/dashboard/leads/${leadId}`);
    const toggle = page.getByTitle(/show comment textarea/i);
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    }
    const textarea = page.getByPlaceholder(/write your thoughts/i);
    await expect(textarea).toBeVisible({ timeout: 15_000 });
    await textarea.fill(commentText);
    await page.getByRole("button", { name: /add comment/i }).click();
    await expect(page.getByText(commentText).first()).toBeVisible({
      timeout: 20_000,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ymd = tomorrow.toISOString().slice(0, 10);
    const reminder = await apiJson(page, `/api/leads/${leadId}/reminders`, {
      method: "POST",
      body: JSON.stringify({
        title: `E2E reminder ${stamp}`,
        description: `E2E reminder ${stamp}`,
        reminderDate: ymd,
        reminderTime: "10:00",
        timezone: "UTC",
      }),
    });
    expect([200, 201]).toContain(reminder.status);
  });

  test("admin sees update and can export", async ({ page }) => {
    expect(leadId).toBeTruthy();
    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    await page.goto(`/dashboard/all-leads/${leadId}`);
    await expect(page.getByText(commentText).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/contacted/i).first()).toBeVisible();

    await page.goto("/dashboard/import");
    await page.getByRole("button", { name: /^export$/i }).click();
    const exportBtn = page.getByRole("button", {
      name: /export|download/i,
    });
    const downloadPromise = page
      .waitForEvent("download", { timeout: 15_000 })
      .catch(() => null);
    if (await exportBtn.last().isVisible().catch(() => false)) {
      await exportBtn.last().click();
    }
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    } else {
      const exportRes = await apiJson(page, "/api/imports/export");
      expect([200, 201]).toContain(exportRes.status);
    }
  });
});

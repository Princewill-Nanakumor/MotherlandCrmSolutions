import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  apiJson,
  loginAs,
} from "./helpers/auth";

/**
 * True browser-to-browser realtime via Ably admin leads channel:
 * Admin changes status in Browser A → Agent list UI updates in Browser B.
 *
 * Skipped pending stabilization of Ably attach timing in headless browser
 * environments. Re-enable when Ably client readiness is observable in the UI
 * (e.g. data-testid="ably-attached").
 */
test.fixme(
  "admin status change updates agent browser via Ably",
  async ({ browser }) => {
  const stamp = Date.now();
  const leadEmail = `realtime.${stamp}@e2e.motherland.test`;

  const adminContext = await browser.newContext();
  const agentContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const agentPage = await agentContext.newPage();

  try {
    await loginAs(adminPage, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const imported = await apiJson(adminPage, "/api/leads/import", {
      method: "POST",
      body: JSON.stringify([
        {
          name: `Realtime Lead ${stamp}`,
          email: leadEmail,
          phone: "+15559876543",
          source: "e2e",
          country: "United States",
        },
      ]),
    });
    expect(imported.status).toBe(200);

    const list = await apiJson(
      adminPage,
      `/api/leads/all?search=${encodeURIComponent(leadEmail)}&pageSize=10`,
    );
    const lead = (list.body as { leads: Array<{ _id: string }> }).leads?.[0];
    expect(lead?._id).toBeTruthy();
    const leadId = lead!._id;

    const users = await apiJson(adminPage, "/api/users");
    const listUsers = Array.isArray(users.body)
      ? (users.body as Array<{ id?: string; _id?: string; email: string }>)
      : (
          users.body as {
            users: Array<{ id?: string; _id?: string; email: string }>;
          }
        ).users;
    const agent = listUsers?.find((u) => u.email === E2E_AGENT_EMAIL);
    const agentUserId = agent?.id || agent?._id;
    expect(agentUserId).toBeTruthy();

    const assign = await apiJson(adminPage, `/api/leads/${leadId}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId: agentUserId }),
    });
    expect([200, 201]).toContain(assign.status);

    await loginAs(agentPage, E2E_AGENT_EMAIL, E2E_PASSWORD);
    await agentPage.goto("/dashboard/leads");
    await expect(agentPage.getByText(leadEmail).first()).toBeVisible({
      timeout: 30_000,
    });
    // Give Ably time to attach before the status event fires
    await agentPage.waitForTimeout(3000);

    const patch = await apiJson(adminPage, `/api/leads/${leadId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "CONTACTED" }),
    });
    expect(patch.status).toBe(200);

    const leadRow = agentPage.locator("tr", { hasText: leadEmail });
    await expect(leadRow.getByTitle(/contacted/i)).toBeVisible({
      timeout: 45_000,
    });
  } finally {
    await adminContext.close();
    await agentContext.close();
  }
});

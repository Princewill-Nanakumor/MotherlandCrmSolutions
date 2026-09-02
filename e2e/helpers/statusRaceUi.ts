import { expect, type BrowserContext, type Page } from "@playwright/test";
import { apiJson } from "./auth";
import { leadDetailsPanel } from "./leadDetailPanelUi";

const ABLY_HOST_PATTERN = /ably\.io|ably-realtime\.com|ably\.net/i;

/** Block Ably before any page loads so the admin UI never receives realtime updates. */
export async function blockAblyOnContext(context: BrowserContext) {
  await context.route(ABLY_HOST_PATTERN, (route) => route.abort());
  // page.route() does not intercept WebSockets; Ably uses wss.
  await context.routeWebSocket(ABLY_HOST_PATTERN, () => {
    /* drop connection */
  });
}

/** Block Ably on an existing page (e.g. after navigation). Prefer {@link blockAblyOnContext}. */
export async function blockAblyOnPage(page: Page) {
  await page.route(ABLY_HOST_PATTERN, (route) => route.abort());
  await page.routeWebSocket(ABLY_HOST_PATTERN, () => {
    /* drop connection */
  });
}

function isLeadDetailGet(url: string, method: string, leadId: string): boolean {
  if (method !== "GET") return false;
  try {
    return new URL(url).pathname === `/api/leads/${leadId}`;
  } catch {
    return false;
  }
}

export function leadDetailLoadedPromise(page: Page, leadId: string) {
  return page.waitForResponse(
    (res) => isLeadDetailGet(res.url(), res.request().method(), leadId) && res.ok(),
    { timeout: 30_000 },
  );
}

function statusComboboxInPanel(page: Page) {
  const panel = leadDetailsPanel(page);
  return panel
    .locator("p", { hasText: /^Status$/ })
    .locator("..")
    .getByRole("combobox");
}

export async function expectPanelStatusLabel(page: Page, label: string) {
  await expect(statusComboboxInPanel(page)).toContainText(label, {
    ignoreCase: true,
    timeout: 15_000,
  });
}

export async function fetchLeadStatusRaw(
  page: Page,
  leadId: string,
): Promise<string> {
  const res = await apiJson(page, `/api/leads/${leadId}`);
  expect(res.status).toBe(200);
  return String((res.body as { status?: string }).status ?? "");
}

type ActivityRow = {
  type?: string;
  metadata?: {
    newStatusId?: string;
    newStatus?: string;
    newStatusName?: string;
  };
};

export async function countStatusChangeActivities(
  page: Page,
  leadId: string,
): Promise<number> {
  const res = await apiJson(page, `/api/leads/${leadId}/activities`);
  expect(res.status).toBe(200);
  const rows = Array.isArray(res.body) ? (res.body as ActivityRow[]) : [];
  return rows.filter((row) => row.type === "STATUS_CHANGE").length;
}

export async function expectStatusRaceToast(page: Page) {
  const toast = page
    .locator('[data-state="open"]')
    .filter({ has: page.locator('[toast-close=""]') })
    .filter({ hasText: /status already up to date/i })
    .last();
  await expect(toast).toBeVisible({ timeout: 15_000 });
}

export async function expectNoStatusErrorToast(page: Page) {
  await expect(page.getByText(/failed to update status/i)).toHaveCount(0);
  await expect(
    page.getByText(/status is already set to this value/i),
  ).toHaveCount(0);
}

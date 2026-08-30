import { expect, type Page } from "@playwright/test";
import { apiJson } from "./auth";

export type UserRow = {
  id?: string;
  _id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

export type StatusRow = {
  id?: string;
  _id?: string;
  name: string;
};

const PAGE_SIZE_OPTIONS = [10, 15, 20, 30, 40, 50, 100, 150, 200, 250, 300, 500];

export function userId(u: UserRow | undefined): string {
  return String(u?.id || u?._id || "");
}

export function statusId(s: StatusRow): string {
  return String(s._id || s.id || "");
}

export function smallestPageSizeAtLeast(n: number): number {
  const hit = PAGE_SIZE_OPTIONS.find((size) => size >= n);
  return hit ?? PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1];
}

export async function listUsers(page: Page): Promise<UserRow[]> {
  const res = await apiJson(page, "/api/users");
  expect(res.status).toBe(200);
  const body = res.body as UserRow[] | { users?: UserRow[] };
  return Array.isArray(body) ? body : body.users || [];
}

export async function listStatuses(page: Page): Promise<StatusRow[]> {
  const res = await apiJson(page, "/api/statuses");
  expect(res.status).toBe(200);
  return (res.body as StatusRow[]) || [];
}

type ImportLeadPayload = {
  name: string;
  email: string;
  phone: string;
  source: string;
  country?: string;
};

/** POST /api/leads/import with backoff when the per-route limiter returns 429. */
export async function importLeadsWithRetry(
  page: Page,
  payload: ImportLeadPayload[],
  options?: { maxAttempts?: number },
): Promise<{ status: number; body: unknown; attempts: number }> {
  const maxAttempts = options?.maxAttempts ?? 5;
  let last: { status: number; body: unknown } = { status: 0, body: null };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    last = await apiJson(page, "/api/leads/import", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (last.status === 200) {
      return { ...last, attempts: attempt };
    }
    if (last.status === 429 && attempt < maxAttempts) {
      await page.waitForTimeout(Math.min(8_000, 1_000 * attempt * attempt));
      continue;
    }
    break;
  }

  return { ...last, attempts: maxAttempts };
}

export async function seedUiLeads(
  page: Page,
  stamp: number,
  count: number,
): Promise<void> {
  const payload = Array.from({ length: count }, (_, i) => ({
    name: `Assign UI ${i}`,
    email: `assign.ui.${stamp}.${i}@e2e.motherland.test`,
    phone: `+1555${String(3000000 + i).slice(0, 7)}`,
    source: "assign-bulk-ui",
    country: "United States",
  }));

  const imported = await importLeadsWithRetry(page, payload);
  expect(
    imported.status,
    `import failed after ${imported.attempts} attempt(s): ${JSON.stringify(imported.body)}`,
  ).toBe(200);
  const body = imported.body as { successCount?: number };
  expect(body.successCount ?? 0).toBeGreaterThanOrEqual(count * 0.99);
}

export async function gotoFilteredBenchLeads(
  page: Page,
  stamp: number,
  expectedCount: number,
): Promise<void> {
  const search = `assign.ui.${stamp}`;
  await page.goto("/dashboard/all-leads");
  const searchInput = page.getByPlaceholder(/search/i).first();
  await expect(searchInput).toBeVisible({ timeout: 30_000 });
  await searchInput.fill(search);

  await expect(page.getByText(search).first()).toBeVisible({ timeout: 60_000 });

  const pageSize = smallestPageSizeAtLeast(expectedCount);
  if (pageSize > 15) {
    await setTablePageSize(page, pageSize);
  }

  await waitForLeadsTableSettled(page, expectedCount);
}

export async function setTablePageSize(page: Page, size: number): Promise<void> {
  const header = page.locator("label").filter({ hasText: /^Show$/ }).locator("..");
  await header.getByRole("combobox").click();
  await page.getByRole("option", { name: String(size), exact: true }).click();
  await expect(header.getByRole("combobox")).toContainText(String(size));
}

/** Leads data grid (not filter dropdowns that also expose a "Select all" checkbox). */
export function leadsDataTable(page: Page) {
  return page.locator("table").filter({ has: page.locator("tbody tr") }).first();
}

/**
 * After bulk mutations the list refetches and briefly shows "Updating" instead of
 * the entries count. Wait until the table is stable before clicking row checkboxes.
 */
export async function waitForLeadsTableSettled(
  page: Page,
  expectedCount: number,
  timeoutMs = 90_000,
): Promise<void> {
  await expect(leadsDataTable(page).locator("tbody tr")).toHaveCount(
    expectedCount,
    { timeout: timeoutMs },
  );
  await expect(
    page.getByText(
      new RegExp(`Showing 1 to ${expectedCount} of ${expectedCount} entries`),
    ),
  ).toBeVisible({ timeout: timeoutMs });
}

export async function selectAllVisibleRows(
  page: Page,
  expectedCount: number,
): Promise<void> {
  await waitForLeadsTableSettled(page, expectedCount);
  const selectAll = leadsDataTable(page).getByRole("checkbox", {
    name: "Select all",
  });
  await expect(selectAll).toBeVisible({ timeout: 15_000 });
  await selectAll.click({ timeout: 15_000 });
  await expect(page.getByText(`${expectedCount} leads selected`)).toBeVisible({
    timeout: 15_000,
  });
}

export function assignDialog(page: Page) {
  return page.locator(".assign-dialog").first();
}

export function reassignConfirmDialog(page: Page) {
  return page.locator(".assign-dialog").filter({
    has: page.getByRole("heading", { name: "Are you sure you want to reassign?" }),
  });
}

export function bulkActionsRoot(page: Page) {
  return page
    .locator("div.flex.flex-wrap")
    .filter({ has: page.getByRole("button", { name: /^Assign\b/ }) })
    .first();
}

/** Visible Radix toast cards (excludes the aria-live announcer duplicate). */
export function openToasts(page: Page) {
  return page
    .locator('[data-state="open"]')
    .filter({ has: page.locator('[toast-close=""]') });
}

export async function expectSuccessToast(
  page: Page,
  description: RegExp,
  timeoutMs = 120_000,
): Promise<void> {
  const toast = openToasts(page).filter({ hasText: "Success!" }).last();
  await expect(toast).toBeVisible({ timeout: timeoutMs });
  await expect(toast.getByText(description)).toBeVisible({ timeout: timeoutMs });
}

/** Close any open toasts so the next step does not match a stale Success! banner. */
export async function dismissToasts(page: Page): Promise<void> {
  const closers = openToasts(page).locator('[toast-close=""]');
  const count = await closers.count();
  for (let i = 0; i < count; i++) {
    await closers.nth(i).click({ force: true }).catch(() => undefined);
  }
  await expect(openToasts(page))
    .toHaveCount(0, { timeout: 10_000 })
    .catch(() => undefined);
}

/**
 * Click a control that kicks off a bulk API call.
 * Loading labels ("Assigning…") often flash faster than Playwright's poll, so we:
 * 1) wait for the matching HTTP response
 * 2) optionally note if a loading label appeared
 * 3) assert the success toast
 */
export async function clickBulkActionAndExpectSuccess(options: {
  page: Page;
  click: () => Promise<void>;
  apiPathIncludes: string;
  loadingText?: RegExp | string;
  successDescription: RegExp;
  timeoutMs?: number;
  /** Skip toast dismiss when a modal is already open (dismiss can steal focus / close overlays). */
  skipDismiss?: boolean;
}): Promise<{ sawLoading: boolean; responseStatus: number }> {
  const {
    page,
    click,
    apiPathIncludes,
    loadingText,
    successDescription,
    timeoutMs = 120_000,
    skipDismiss = false,
  } = options;

  if (!skipDismiss) {
    await dismissToasts(page);
  }

  const responsePromise = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes(apiPathIncludes),
    { timeout: timeoutMs },
  );

  await click();
  const response = await responsePromise;
  expect(
    response.ok(),
    `${apiPathIncludes} returned ${response.status()}`,
  ).toBeTruthy();
  await expectSuccessToast(page, successDescription, timeoutMs);

  let sawLoading = false;
  if (loadingText != null) {
    sawLoading = await page
      .getByText(loadingText)
      .first()
      .isVisible()
      .catch(() => false);
  }

  return { sawLoading, responseStatus: response.status() };
}

export async function expectAssignedColumn(
  page: Page,
  assigneeLabel: string,
  rowCount: number,
): Promise<void> {
  await waitForLeadsTableSettled(page, rowCount);
  const rows = leadsDataTable(page).locator("tbody tr");
  await expect(rows.getByText(assigneeLabel, { exact: true })).toHaveCount(
    rowCount,
    { timeout: 60_000 },
  );
}

export async function expectUnassignedColumn(page: Page, rowCount: number): Promise<void> {
  await waitForLeadsTableSettled(page, rowCount);
  const rows = leadsDataTable(page).locator("tbody tr");
  await expect(rows.getByText("Unassigned", { exact: true })).toHaveCount(
    rowCount,
    { timeout: 60_000 },
  );
}

export async function expectStatusColumn(
  page: Page,
  statusName: string,
  rowCount: number,
): Promise<void> {
  await waitForLeadsTableSettled(page, rowCount);
  const rows = leadsDataTable(page).locator("tbody tr");
  await expect(rows.getByText(statusName, { exact: true })).toHaveCount(
    rowCount,
    { timeout: 60_000 },
  );
}

export function pickBulkStatus(statuses: StatusRow[]): StatusRow {
  const nonNew =
    statuses.find((s) => s.name.trim().toLowerCase() !== "new") ?? statuses[0];
  expect(nonNew, "need at least one status from /api/statuses").toBeTruthy();
  return nonNew!;
}

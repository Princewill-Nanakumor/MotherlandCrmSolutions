import { expect, type Page } from "@playwright/test";
import { openToasts } from "./assignmentUi";

export type CreateUserSyncTimings = {
  submitMs: number;
  apiWireMs: number;
  modalClosedMs: number;
  toastVisibleMs: number;
  tableRowMs: number;
};

export function addUserModal(page: Page) {
  return page
    .locator("div.fixed.inset-0")
    .filter({ has: page.getByRole("heading", { name: "Add New User" }) });
}

export async function gotoUsersPage(page: Page) {
  await page.goto("/dashboard/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible({
    timeout: 60_000,
  });
}

export async function openAddUserModal(page: Page) {
  const createButton = page.getByRole("button", { name: /^Create User$/i });
  await expect(createButton).toBeEnabled({ timeout: 60_000 });
  await createButton.click();
  const modal = addUserModal(page);
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.getByRole("heading", { name: "Add New User" })).toBeVisible();
  return modal;
}

export async function fillAddUserForm(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    countryLabel?: string;
    phoneNumber?: string;
  },
) {
  const modal = addUserModal(page);
  const countryLabel = data.countryLabel ?? "United States";

  await modal.locator("#firstName").fill(data.firstName);
  await modal.locator("#lastName").fill(data.lastName);
  await modal.locator("#email").fill(data.email);
  await modal.locator("#password").fill(data.password);

  await modal.locator(".react-select__control").click();
  await page
    .getByRole("option", { name: new RegExp(`^${countryLabel}\\b`) })
    .click();

  const phone = data.phoneNumber ?? "+12025550123";
  const phoneInput = modal.locator(".phone-input-wrapper input");
  await phoneInput.click();
  await phoneInput.fill(phone);
}

export async function expectUserCreateToast(page: Page, timeoutMs = 60_000) {
  const toast = openToasts(page)
    .filter({ hasText: /Success/ })
    .filter({ hasText: /User created successfully/i })
    .last();
  await expect(toast).toBeVisible({ timeout: timeoutMs });
  return toast;
}

export async function expectUserRowVisible(
  page: Page,
  email: string,
  timeoutMs = 60_000,
) {
  const row = page.locator("table tbody tr").filter({ hasText: email }).first();
  await expect(row).toBeVisible({ timeout: timeoutMs });
  return row;
}

/**
 * Submit Add User form and assert modal → API → toast → table stay in sync.
 * Returns timing breakdown for perf debugging.
 */
export async function submitAddUserAndExpectSync(
  page: Page,
  email: string,
): Promise<CreateUserSyncTimings> {
  const modal = addUserModal(page);
  const submit = modal.getByRole("button", { name: /^Create User$/i });

  const t0 = Date.now();

  const responsePromise = page.waitForResponse(
    (res) => res.request().method() === "POST" && res.url().includes("/api/users"),
    { timeout: 120_000 },
  );
  const toastPromise = expectUserCreateToast(page);

  await submit.click();

  await expect(submit).toHaveText(/Creating/i, { timeout: 10_000 }).catch(() => {
    // Fast paths may skip the loading label; response + assertions still cover sync.
  });

  const response = await responsePromise;
  const apiWireMs = Date.now() - t0;
  expect(response.ok(), `POST /api/users failed: ${response.status()}`).toBeTruthy();

  await toastPromise;
  const toastVisibleMs = Date.now() - t0;

  await expect(modal).toBeHidden({ timeout: 30_000 });
  const modalClosedMs = Date.now() - t0;

  await expectUserRowVisible(page, email);
  const tableRowMs = Date.now() - t0;

  return {
    submitMs: t0,
    apiWireMs,
    modalClosedMs,
    toastVisibleMs,
    tableRowMs,
  };
}

export async function deleteUserByEmail(page: Page, email: string) {
  const list = await page.evaluate(async () => {
    const res = await fetch("/api/users", { credentials: "include" });
    const body = await res.json();
    return body as { id?: string; _id?: string; email?: string }[];
  });

  const user = (list ?? []).find((u) => u.email === email);
  if (!user) return false;

  const userId = String(user.id || user._id);
  const del = await page.evaluate(async (id) => {
    const res = await fetch(`/api/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  }, userId);

  return del;
}

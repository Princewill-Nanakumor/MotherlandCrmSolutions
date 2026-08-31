/**
 * Users page — Add New User modal sync: form → API → modal close → toast → table.
 *
 *   npm run test:users-create-ui
 *   USERS_CREATE_UI=1 npx playwright test e2e/users-create-ui.spec.ts
 */
import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_PASSWORD, loginAs } from "./helpers/auth";
import {
  deleteUserByEmail,
  fillAddUserForm,
  gotoUsersPage,
  openAddUserModal,
  submitAddUserAndExpectSync,
} from "./helpers/userManagementUi";

const enabled = process.env.USERS_CREATE_UI === "1";

test.describe("users create UI (Add New User modal)", () => {
  test.skip(!enabled, "Set USERS_CREATE_UI=1 to run");

  test("create user keeps modal, toast, and table in sync", async ({ page }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const email = `e2e.user.create.${stamp}@motherland.test`;
    const firstName = "E2E";
    const lastName = `Create${stamp}`;

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await gotoUsersPage(page);
    await openAddUserModal(page);

    await fillAddUserForm(page, {
      firstName,
      lastName,
      email,
      password: "E2eTest1!",
      countryLabel: "United States",
      phoneNumber: "+12025550123",
    });

    const timings = await submitAddUserAndExpectSync(page, email);

    // Modal must not linger after success.
    expect(timings.modalClosedMs).toBeLessThanOrEqual(timings.toastVisibleMs + 500);
    // Table should update shortly after toast (same refetch pipeline).
    expect(timings.tableRowMs).toBeLessThanOrEqual(timings.toastVisibleMs + 5_000);

    const row = page.locator("table tbody tr").filter({ hasText: email }).first();
    await expect(row).toContainText(lastName);
    await expect(row).toContainText("AGENT");

    console.log(
      JSON.stringify(
        {
          flow: "users-create-ui",
          apiWireMs: timings.apiWireMs,
          modalClosedMs: timings.modalClosedMs,
          toastVisibleMs: timings.toastVisibleMs,
          tableRowMs: timings.tableRowMs,
        },
        null,
        2,
      ),
    );

    const deleted = await deleteUserByEmail(page, email);
    expect(deleted, "cleanup: delete created e2e user").toBeTruthy();
  });
});

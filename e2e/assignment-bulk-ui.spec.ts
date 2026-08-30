/**
 * All Leads bulk bar UI sync: dialogs, toasts, table columns, selection clear.
 * Loading labels are observed when they linger; fast batches may finish before
 * Playwright can see them (still covered by waitForResponse + toast + table).
 *
 *   npm run test:assign-bulk-ui
 *   ASSIGN_BULK_UI=1 ASSIGN_UI_SIZE=25 npx playwright test e2e/assignment-bulk-ui.spec.ts
 *
 * API speed at 200–500 leads: npm run test:assign-bulk-bench (separate spec).
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_AGENT_B_EMAIL,
  E2E_PASSWORD,
  loginAs,
} from "./helpers/auth";
import {
  assignDialog,
  bulkActionsRoot,
  clickBulkActionAndExpectSuccess,
  dismissToasts,
  expectAssignedColumn,
  expectStatusColumn,
  expectUnassignedColumn,
  gotoFilteredBenchLeads,
  listStatuses,
  listUsers,
  pickBulkStatus,
  seedUiLeads,
  reassignConfirmDialog,
  selectAllVisibleRows,
  statusId,
  userId,
  waitForLeadsTableSettled,
} from "./helpers/assignmentUi";

const enabled = process.env.ASSIGN_BULK_UI === "1";
const MAX_UI_SIZE = 50;
const size = Math.min(
  MAX_UI_SIZE,
  Math.max(1, Number(process.env.ASSIGN_UI_SIZE || 10)),
);

test.describe.configure({ mode: "serial" });

test.describe("assignment bulk UI (All Leads)", () => {
  test.skip(!enabled, "Set ASSIGN_BULK_UI=1 to run");
  test.skip(
    size > MAX_UI_SIZE,
    `ASSIGN_UI_SIZE=${size} exceeds UI cap ${MAX_UI_SIZE} (use assign-bulk-bench for 200–500)`,
  );

  test(`assign → reassign → bulk status → unassign (${size} leads, UI)`, async ({
    page,
  }) => {
    test.setTimeout(Math.max(300_000, size * 15_000));

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    const users = await listUsers(page);
    const agentA = users.find((u) => u.email === E2E_AGENT_EMAIL);
    const agentB = users.find((u) => u.email === E2E_AGENT_B_EMAIL);
    expect(agentA, `missing ${E2E_AGENT_EMAIL} — run npm run test:e2e:seed`).toBeTruthy();
    expect(
      agentB,
      `missing ${E2E_AGENT_B_EMAIL} — re-run npm run test:e2e:seed`,
    ).toBeTruthy();

    const agentAId = userId(agentA);
    const agentBId = userId(agentB);
    expect(agentAId).toBeTruthy();
    expect(agentBId).toBeTruthy();
    expect(agentAId).not.toBe(agentBId);

    const agentATableLabel = `${agentA!.firstName} ${agentA!.lastName}`;
    const agentBTableLabel = `${agentB!.firstName} ${agentB!.lastName}`;

    const statuses = await listStatuses(page);
    const targetStatus = pickBulkStatus(statuses);
    const targetStatusKey = statusId(targetStatus);

    const stamp = Date.now();
    await seedUiLeads(page, stamp, size);
    await gotoFilteredBenchLeads(page, stamp, size);

    const dialog = () => assignDialog(page);
    const bulkBar = () => bulkActionsRoot(page);

    // --- Assign ---
    await selectAllVisibleRows(page, size);
    await bulkBar().getByRole("button", { name: /^Assign\b/ }).click();
    await expect(
      page.getByRole("heading", { name: "Assign Multiple Leads" }),
    ).toBeVisible();

    await dialog().locator("select").selectOption(agentAId);
    await clickBulkActionAndExpectSuccess({
      page,
      click: () =>
        dialog().getByRole("button", { name: "Assign", exact: true }).click(),
      apiPathIncludes: "/api/leads/assign",
      loadingText: "Assigning...",
      successDescription: new RegExp(
        `Successfully assigned ${size} lead\\(s\\)`,
      ),
      timeoutMs: 60_000,
    });

    await expect(
      page.getByRole("heading", { name: "Assign Multiple Leads" }),
    ).not.toBeVisible();
    await expect(page.getByText(/\d+ leads? selected/)).not.toBeVisible();
    await expectAssignedColumn(page, agentATableLabel, size);
    await dismissToasts(page);
    await waitForLeadsTableSettled(page, size);

    // --- Reassign ---
    await selectAllVisibleRows(page, size);
    await bulkBar().getByRole("button", { name: /^Assign\b/ }).click();
    await expect(
      page.getByRole("heading", { name: "Assign Multiple Leads" }),
    ).toBeVisible();

    const reassignSelect = dialog().locator("select");
    await reassignSelect.selectOption(agentBId);
    await expect(reassignSelect).toHaveValue(agentBId);
    await dialog().getByRole("button", { name: "Reassign" }).click();
    const confirm = reassignConfirmDialog(page);
    await expect(confirm).toBeVisible();
    const yesReassign = confirm.getByRole("button", { name: "Yes, Reassign" });
    await expect(yesReassign).toBeEnabled();

    await clickBulkActionAndExpectSuccess({
      page,
      skipDismiss: true,
      click: () => yesReassign.click(),
      apiPathIncludes: "/api/leads/assign",
      loadingText: /Reassigning\.\.\./,
      successDescription: new RegExp(
        `Successfully assigned ${size} lead\\(s\\)`,
      ),
      timeoutMs: 60_000,
    });

    await expect(page.getByText(/\d+ leads? selected/)).not.toBeVisible();
    await expectAssignedColumn(page, agentBTableLabel, size);
    await dismissToasts(page);
    await waitForLeadsTableSettled(page, size);

    // --- Bulk status ---
    await selectAllVisibleRows(page, size);
    await bulkBar().getByRole("combobox").click();
    await page.getByRole("option", { name: targetStatus.name, exact: true }).click();

    await expect(page.getByText("Apply bulk status change?")).toBeVisible();
    await expect(
      page.getByRole("alertdialog").getByText(targetStatus.name, { exact: true }),
    ).toBeVisible();

    await clickBulkActionAndExpectSuccess({
      page,
      skipDismiss: true,
      click: () => page.getByRole("button", { name: "OK" }).click(),
      apiPathIncludes: "/api/leads/bulk/status",
      loadingText: /Applying|Changing status/,
      successDescription: new RegExp(
        `Successfully changed status for ${size} lead\\(s\\)`,
      ),
      timeoutMs: 60_000,
    });

    await expect(page.getByText(/\d+ leads? selected/)).not.toBeVisible();
    await expectStatusColumn(page, targetStatus.name, size);
    expect(targetStatusKey.length).toBeGreaterThan(0);
    await dismissToasts(page);
    await waitForLeadsTableSettled(page, size);

    // --- Unassign ---
    await selectAllVisibleRows(page, size);
    await expect(bulkBar().getByRole("button", { name: /^Unassign\b/ })).toBeVisible();

    await bulkBar().getByRole("button", { name: /^Unassign\b/ }).click();
    await expect(page.getByText("Unassign leads?")).toBeVisible();

    await clickBulkActionAndExpectSuccess({
      page,
      skipDismiss: true,
      click: () =>
        page
          .getByRole("button", {
            name: new RegExp(`Yes, Unassign \\(${size}\\)`),
          })
          .click(),
      apiPathIncludes: "/api/leads/unassign",
      loadingText: "Unassigning...",
      successDescription: new RegExp(
        `Successfully unassigned ${size} lead\\(s\\)`,
      ),
      timeoutMs: 60_000,
    });

    await expect(page.getByText("Unassign leads?")).not.toBeVisible();
    await expect(page.getByText(/\d+ leads? selected/)).not.toBeVisible();
    await expectUnassignedColumn(page, size);

    // Bulk bar hidden when nothing is selected; re-select and confirm controls are enabled.
    await selectAllVisibleRows(page, size);
    await expect(bulkBar().getByRole("button", { name: /^Assign\b/ })).toBeEnabled();
    await expect(bulkBar().getByRole("button", { name: /^Unassign\b/ })).toBeHidden();
    await expect(bulkBar().getByRole("combobox")).toBeEnabled();
  });
});

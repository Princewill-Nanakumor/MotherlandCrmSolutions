/**
 * Users page — Add New User modal sync: form → API → modal close → toast → table.
 *
 *   npm run test:users-create-ui
 *   USERS_CREATE_UI=1 API_PERF_TIMING=1 npx playwright test e2e/users-create-ui.spec.ts
 *
 * Prints cold + warm create timings. Compare apiWireMs vs serverTimingMs —
 * a large gap usually means Next.js route compile / queue before the handler.
 */
import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_PASSWORD, loginAs } from "./helpers/auth";
import {
  deleteUserByEmail,
  fillAddUserForm,
  gotoUsersPage,
  openAddUserModal,
  submitAddUserAndExpectSync,
  type CreateUserSyncTimings,
} from "./helpers/userManagementUi";
import { dismissToasts } from "./helpers/assignmentUi";

const enabled = process.env.USERS_CREATE_UI === "1";

function parsePerfEvents(raw: string | null) {
  return (raw || "")
    .split("|")
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq <= 0) return { label: part, ms: NaN, detail: null as string | null };
      const labelPart = part.slice(0, eq);
      const rest = part.slice(eq + 1);
      const detailMatch = rest.match(/^([\d.]+)(?:\((.*)\))?$/);
      return {
        label: labelPart,
        ms: detailMatch ? Number(detailMatch[1]) : Number(rest),
        detail: detailMatch?.[2] ?? null,
      };
    });
}

function reportCreate(label: "cold" | "warm", timings: CreateUserSyncTimings) {
  const stages = (timings.serverStages || "")
    .split("|")
    .filter(Boolean)
    .map((part) => {
      const eq = part.lastIndexOf("=");
      return eq > 0
        ? { label: part.slice(0, eq), ms: Number(part.slice(eq + 1)) }
        : { label: part, ms: NaN };
    });

  const sessionEvents = parsePerfEvents(timings.sessionPerf);
  const mongoEvents = parsePerfEvents(timings.mongoPerf);

  console.log(
    JSON.stringify(
      {
        flow: "users-create-ui",
        warmth: label,
        apiRequestStartedMs: timings.apiRequestStartedMs,
        apiWireMs: timings.apiWireMs,
        resourceTimingMs: timings.resourceTimingMs,
        serverTimingMs: timings.serverTimingMs,
        serverWallMs: timings.serverWallMs,
        gapOutsideHandlerMs:
          timings.serverWallMs != null
            ? Math.max(
                0,
                timings.apiWireMs -
                  (timings.apiRequestStartedMs ?? 0) -
                  timings.serverWallMs,
              )
            : timings.serverTimingMs != null
              ? Math.max(
                  0,
                  timings.apiWireMs -
                    (timings.apiRequestStartedMs ?? 0) -
                    timings.serverTimingMs,
                )
              : null,
        modalClosedMs: timings.modalClosedMs,
        toastVisibleMs: timings.toastVisibleMs,
        tableRowMs: timings.tableRowMs,
        serverStages: stages,
        sessionPerf: sessionEvents,
        mongoPerf: mongoEvents,
      },
      null,
      2,
    ),
  );
}

test.describe("users create UI (Add New User modal)", () => {
  test.skip(!enabled, "Set USERS_CREATE_UI=1 to run");

  test("create user keeps modal, toast, and table in sync", async ({ page }) => {
    test.setTimeout(240_000);

    const stamp = Date.now();
    const emails = [
      `e2e.user.create.${stamp}.a@motherland.test`,
      `e2e.user.create.${stamp}.b@motherland.test`,
    ];

    await loginAs(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await gotoUsersPage(page);

    const coldEmail = emails[0];
    await openAddUserModal(page);
    await fillAddUserForm(page, {
      firstName: "E2E",
      lastName: `Cold${stamp}`,
      email: coldEmail,
      password: "E2eTest1!",
      countryLabel: "United States",
      phoneNumber: "+12025550123",
    });
    const cold = await submitAddUserAndExpectSync(page, coldEmail);
    reportCreate("cold", cold);

    expect(cold.modalClosedMs).toBeLessThanOrEqual(cold.toastVisibleMs + 500);
    expect(cold.tableRowMs).toBeLessThanOrEqual(cold.toastVisibleMs + 5_000);

    await dismissToasts(page);

    const warmEmail = emails[1];
    await openAddUserModal(page);
    await fillAddUserForm(page, {
      firstName: "E2E",
      lastName: `Warm${stamp}`,
      email: warmEmail,
      password: "E2eTest1!",
      countryLabel: "United States",
      phoneNumber: "+12025550124",
    });
    const warm = await submitAddUserAndExpectSync(page, warmEmail);
    reportCreate("warm", warm);

    expect(warm.modalClosedMs).toBeLessThanOrEqual(warm.toastVisibleMs + 500);
    expect(warm.tableRowMs).toBeLessThanOrEqual(warm.toastVisibleMs + 5_000);

    for (const email of emails) {
      const deleted = await deleteUserByEmail(page, email);
      expect(deleted, `cleanup: delete ${email}`).toBeTruthy();
    }
  });
});

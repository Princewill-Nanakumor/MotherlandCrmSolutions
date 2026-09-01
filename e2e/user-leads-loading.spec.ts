/**
 * Agent leads bootstrap loading — functional UX contract (not a perf benchmark).
 *
 *   npm run test:user-leads-loading
 *
 * Requires the app on :3000 (Playwright webServer starts `npm run dev` by default).
 */
import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN_EMAIL,
  E2E_AGENT_EMAIL,
  E2E_PASSWORD,
  loginAsFast,
} from "./helpers/auth";
import { leadsDataTable } from "./helpers/assignmentUi";
import {
  assertStableBootstrapShell,
  assertStablePostBootstrapUi,
  bootstrapShell,
  BootstrapCheckpoint,
  BootstrapViolationTracker,
  BOOTSTRAP_SHELL_TIMEOUT_MS,
  clearUserLeadsRouteMocks,
  expectMyLeadsFiltersReady,
  filterLoadingShell,
  inspectBootstrapShell,
  inspectPostBootstrapUi,
  installAssignedLeadsRefetchDelay,
  installStaggeredBootstrapDelays,
  LEADS_DELAY_MS,
  REFETCH_DELAY_MS,
  removeBootstrapDelays,
  seedAssignedLeadsForAgent,
  SUBSCRIPTION_DELAY_MS,
  triggerAssignedLeadsRefetch,
  warmUpMyLeadsRoute,
} from "./helpers/userLeadsLoadingUi";

const enabled = process.env.USER_LEADS_LOADING_E2E === "1";

async function expectUserLeadsTableAreaSettled(
  page: import("@playwright/test").Page,
) {
  const row = leadsDataTable(page).locator("tbody tr").first();
  const pagination = page.getByText(/Showing \d+ to \d+ entries/i);
  const emptyHeading = page.getByRole("heading", {
    name: /no leads (available|found)/i,
  });
  await expect(row.or(pagination).or(emptyHeading).first()).toBeVisible({
    timeout: BOOTSTRAP_SHELL_TIMEOUT_MS,
  });
}

function logContract(scenario: string, data: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({ flow: "user-leads-loading", scenario, ...data }, null, 2),
  );
}

test.describe("user-leads loading contract", () => {
  test.skip(!enabled, "Set USER_LEADS_LOADING_E2E=1 to run");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsFast(page, E2E_AGENT_EMAIL, E2E_PASSWORD);
    await warmUpMyLeadsRoute(page);
    await context.close();
  });

  test.afterEach(async ({ page }) => {
    await clearUserLeadsRouteMocks(page);
  });

  test("bootstrap shell stays stable while subscription and leads load", async ({
    page,
  }) => {
    await loginAsFast(page, E2E_AGENT_EMAIL, E2E_PASSWORD);
    await clearUserLeadsRouteMocks(page);
    await installStaggeredBootstrapDelays(page);

    const subscriptionResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/subscription/agent-status") &&
        res.request().method() === "GET",
      { timeout: BOOTSTRAP_SHELL_TIMEOUT_MS },
    );
    const leadsResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/leads/assigned") &&
        res.request().method() === "GET" &&
        res.ok(),
      { timeout: BOOTSTRAP_SHELL_TIMEOUT_MS },
    );

    const tracker = new BootstrapViolationTracker();
    let bootstrapComplete = false;
    let shellSeen = false;
    let currentCheckpoint: BootstrapCheckpoint = "shell-visible";

    const watchStability = (async () => {
      while (!bootstrapComplete) {
        if (shellSeen) {
          const violations = await inspectBootstrapShell(
            page,
            currentCheckpoint === "shell-visible"
              ? "background-watch"
              : currentCheckpoint,
          );
          for (const violation of violations) {
            tracker.record(violation);
          }
        }
        await page.waitForTimeout(100);
        if (!shellSeen) {
          shellSeen = await bootstrapShell(page).isVisible().catch(() => false);
        }
      }
    })();

    void watchStability;

    try {
      await page.goto("/dashboard/leads", {
        waitUntil: "domcontentloaded",
        timeout: BOOTSTRAP_SHELL_TIMEOUT_MS,
      });

      await assertStableBootstrapShell(page, "shell-visible");
      shellSeen = true;
      logContract("shell-visible", {
        subscriptionDelayMs: SUBSCRIPTION_DELAY_MS,
        leadsDelayMs: LEADS_DELAY_MS,
      });

      await subscriptionResponse;
      currentCheckpoint = "subscription-resolved-leads-pending";
      await assertStableBootstrapShell(page, currentCheckpoint);
      logContract("subscription-resolved-leads-pending");

      bootstrapComplete = true;
      await watchStability;

      await leadsResponse;
      logContract("leads-resolved");

      await page.waitForTimeout(250);

      tracker.assertEmpty();

      await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 15_000 });
      await expect(filterLoadingShell(page)).toHaveCount(0, { timeout: 15_000 });
      logContract("shell-cleared");

      await expectMyLeadsFiltersReady(page);
      await expectUserLeadsTableAreaSettled(page);
      logContract("settled", { ok: true });
    } finally {
      bootstrapComplete = true;
      await watchStability.catch(() => undefined);
      await removeBootstrapDelays(page);
    }
  });

  test("warm revisit does not re-show bootstrap shell", async ({ page }) => {
    await loginAsFast(page, E2E_AGENT_EMAIL, E2E_PASSWORD);

    await page.goto("/dashboard/leads", {
      waitUntil: "domcontentloaded",
      timeout: BOOTSTRAP_SHELL_TIMEOUT_MS,
    });
    await expect(bootstrapShell(page)).toHaveCount(0, {
      timeout: BOOTSTRAP_SHELL_TIMEOUT_MS,
    });
    await expectMyLeadsFiltersReady(page);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });

    await expectMyLeadsFiltersReady(page);
    await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 5_000 });

    logContract("warm-revisit", { ok: true });
  });

  test("post-bootstrap client filter and pagination keep settled UI", async ({
    page,
    browser,
  }) => {
    const stamp = Date.now();
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsFast(adminPage, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await seedAssignedLeadsForAgent(adminPage, 2, stamp);
    await adminContext.close();

    await loginAsFast(page, E2E_AGENT_EMAIL, E2E_PASSWORD);
    await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
    await expectUserLeadsTableAreaSettled(page);
    await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 15_000 });

    const rowsBefore = await leadsDataTable(page).locator("tbody tr").count();
    expect(rowsBefore).toBeGreaterThanOrEqual(2);

    const countryParam = encodeURIComponent(JSON.stringify(["United States"]));
    await page.goto(
      `/dashboard/leads?country=${countryParam}&countryMode=include`,
      { waitUntil: "domcontentloaded" },
    );
    await assertStablePostBootstrapUi(page, "client-filter", {
      minVisibleRows: 1,
    });
    logContract("client-filter", { country: "United States", ok: true });

    await page.goto(
      `/dashboard/leads?country=${countryParam}&countryMode=include&pageSize=1&page=2`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(page.getByText(/Page 2 of/i)).toBeVisible({ timeout: 15_000 });
    await assertStablePostBootstrapUi(page, "client-pagination", {
      minVisibleRows: 1,
    });
    logContract("client-pagination", { ok: true });
  });

  test("post-bootstrap assigned-leads refetch keeps rows visible", async ({
    page,
    browser,
  }) => {
    const stamp = Date.now();
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsFast(adminPage, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await seedAssignedLeadsForAgent(adminPage, 2, stamp);
    await adminContext.close();

    await loginAsFast(page, E2E_AGENT_EMAIL, E2E_PASSWORD);
    await page.goto("/dashboard/leads", { waitUntil: "domcontentloaded" });
    await expectUserLeadsTableAreaSettled(page);
    await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 15_000 });

    const rowsBefore = await leadsDataTable(page).locator("tbody tr").count();
    expect(rowsBefore).toBeGreaterThanOrEqual(2);

    const refetchDelay = await installAssignedLeadsRefetchDelay(page);

    let refetchComplete = false;
    const tracker = new BootstrapViolationTracker();
    const watchRefetch = (async () => {
      while (!refetchComplete) {
        const violations = await inspectPostBootstrapUi(
          page,
          "refetch-in-flight",
          { minVisibleRows: rowsBefore },
        );
        for (const violation of violations) {
          tracker.record(violation);
        }
        await page.waitForTimeout(100);
      }
    })();
    void watchRefetch;

    try {
      const refetchResponse = page.waitForResponse(
        (res) =>
          res.url().includes("/api/leads/assigned") &&
          res.request().method() === "GET",
        { timeout: BOOTSTRAP_SHELL_TIMEOUT_MS },
      );

      refetchDelay.arm();
      await triggerAssignedLeadsRefetch(page);

      await refetchResponse;
      await page.waitForTimeout(250);
      tracker.assertEmpty();

      await assertStablePostBootstrapUi(page, "refetch-settled", {
        minVisibleRows: rowsBefore,
      });
      logContract("refetch-in-flight", {
        refetchDelayMs: REFETCH_DELAY_MS,
        rowsBefore,
        ok: true,
      });
    } finally {
      refetchComplete = true;
      await watchRefetch.catch(() => undefined);
      await refetchDelay.remove();
    }
  });
});

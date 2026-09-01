/**
 * All-leads bootstrap loading — functional UX contract (not a perf benchmark).
 *
 *   npm run test:all-leads-loading
 *
 * Requires the app on :3000 (Playwright webServer starts `npm run dev` by default).
 */
import { expect, test } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_PASSWORD, loginAsFast } from "./helpers/auth";
import { leadsDataTable } from "./helpers/assignmentUi";
import {
  assertStableBootstrapShell,
  bootstrapShell,
  BootstrapCheckpoint,
  BootstrapViolationTracker,
  filterLoadingShell,
  inspectBootstrapShell,
  installStaggeredBootstrapDelays,
  LEADS_DELAY_MS,
  removeBootstrapDelays,
  SUBSCRIPTION_DELAY_MS,
} from "./helpers/allLeadsLoadingUi";

const enabled = process.env.ALL_LEADS_LOADING_E2E === "1";

async function expectLeadsTableAreaSettled(
  page: import("@playwright/test").Page,
) {
  const row = leadsDataTable(page).locator("tbody tr").first();
  const pagination = page.getByText(/Showing \d+ to \d+ entries/i);
  const emptyHeading = page.getByRole("heading", { name: /no .* found/i });
  await expect(row.or(pagination).or(emptyHeading).first()).toBeVisible({
    timeout: 60_000,
  });
}

function logContract(scenario: string, data: Record<string, unknown> = {}) {
  console.log(
    JSON.stringify({ flow: "all-leads-loading", scenario, ...data }, null, 2),
  );
}

test.describe("all-leads loading contract", () => {
  test.skip(!enabled, "Set ALL_LEADS_LOADING_E2E=1 to run");

  test("bootstrap shell stays stable while subscription and leads load", async ({
    page,
  }) => {
    await loginAsFast(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);
    await installStaggeredBootstrapDelays(page);

    const subscriptionResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/subscription/status") &&
        res.request().method() === "GET",
      { timeout: 60_000 },
    );
    const leadsResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/leads/all") &&
        res.request().method() === "GET" &&
        res.ok(),
      { timeout: 60_000 },
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

    await page.goto("/dashboard/all-leads", { waitUntil: "domcontentloaded" });

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

    await leadsResponse;
    bootstrapComplete = true;
    logContract("leads-resolved");

    await page.waitForTimeout(250);

    tracker.assertEmpty();

    await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 15_000 });
    await expect(filterLoadingShell(page)).toHaveCount(0, { timeout: 15_000 });
    logContract("shell-cleared");

    await expect(
      page.getByRole("button", { name: /all statuses/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByPlaceholder(/search/i).first()).toBeEnabled({
      timeout: 15_000,
    });
    await expectLeadsTableAreaSettled(page);
    logContract("settled", { ok: true });

    await removeBootstrapDelays(page);
  });

  test("warm revisit does not re-show bootstrap shell", async ({ page }) => {
    await loginAsFast(page, E2E_ADMIN_EMAIL, E2E_PASSWORD);

    await page.goto("/dashboard/all-leads", { waitUntil: "domcontentloaded" });
    await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /all statuses/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.goto("/dashboard/all-leads", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /leads management/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(bootstrapShell(page)).toHaveCount(0, { timeout: 5_000 });
    await expect(
      page.getByRole("button", { name: /all statuses/i }),
    ).toBeVisible({ timeout: 10_000 });

    logContract("warm-revisit", { ok: true });
  });
});

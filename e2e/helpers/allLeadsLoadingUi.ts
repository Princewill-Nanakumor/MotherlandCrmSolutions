import { expect, type Page } from "@playwright/test";

export const SUBSCRIPTION_DELAY_MS = 1_000;
export const LEADS_DELAY_MS = 2_500;

export type BootstrapCheckpoint =
  | "shell-visible"
  | "subscription-resolved-leads-pending"
  | "background-watch";

export type BootstrapViolation = {
  contract: string;
  expected: string;
  found: string;
  checkpoint: BootstrapCheckpoint;
  /** DOM locator hint — included only when it helps diagnose the failure. */
  selector?: string;
};

export const BOOTSTRAP_SHELL_SELECTOR =
  '[data-testid="all-leads-bootstrap-shell"]';
export const FILTER_LOADING_SELECTOR = '[aria-label="Loading filters"]';
export const FULLSCREEN_SPINNER_SELECTOR =
  'main [data-testid="fullscreen-loading-spinner"]';
export const LEADS_TITLE_SELECTOR = 'role=heading[name=/leads management/i]';

export const bootstrapShell = (page: Page) =>
  page.getByTestId("all-leads-bootstrap-shell");

export const filterLoadingShell = (page: Page) =>
  page.locator(FILTER_LOADING_SELECTOR);

export const fullscreenLoadingSpinner = (page: Page) =>
  page.locator("main").getByTestId("fullscreen-loading-spinner");

export function formatBootstrapViolations(
  violations: BootstrapViolation[],
): string {
  if (!violations.length) return "";
  return violations
    .map((v) => {
      const lines = [
        "Bootstrap shell violation:",
        `- contract: ${v.contract}`,
        `- expected: ${v.expected}`,
        `- found: ${v.found}`,
        `- checkpoint: ${v.checkpoint}`,
      ];
      if (v.selector) {
        lines.push(`- selector: ${v.selector}`);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export class BootstrapViolationTracker {
  private readonly violations: BootstrapViolation[] = [];
  private readonly seen = new Set<string>();

  record(violation: BootstrapViolation) {
    const key = `${violation.contract}|${violation.checkpoint}|${violation.found}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.violations.push(violation);
  }

  all(): BootstrapViolation[] {
    return [...this.violations];
  }

  assertEmpty() {
    const list = this.all();
    expect(
      list,
      list.length ? formatBootstrapViolations(list) : undefined,
    ).toEqual([]);
  }
}

export async function inspectBootstrapShell(
  page: Page,
  checkpoint: BootstrapCheckpoint,
): Promise<BootstrapViolation[]> {
  const violations: BootstrapViolation[] = [];

  const shellVisible = await bootstrapShell(page).isVisible().catch(() => false);
  if (!shellVisible) {
    violations.push({
      contract: "single bootstrap shell",
      expected: "visible",
      found: "not visible",
      checkpoint,
      selector: BOOTSTRAP_SHELL_SELECTOR,
    });
  }

  const filterShellCount = await filterLoadingShell(page).count();
  if (filterShellCount !== 1) {
    violations.push({
      contract: "filter loading placeholder inside bootstrap shell",
      expected: "1",
      found: String(filterShellCount),
      checkpoint,
      selector: FILTER_LOADING_SELECTOR,
    });
  }

  const spinnerCount = await fullscreenLoadingSpinner(page).count();
  if (spinnerCount > 0) {
    violations.push({
      contract: "no fullscreen spinner in main during bootstrap",
      expected: "0",
      found: String(spinnerCount),
      checkpoint,
      selector: FULLSCREEN_SPINNER_SELECTOR,
    });
  }

  const titleVisible = await page
    .getByRole("heading", { name: /leads management/i })
    .isVisible()
    .catch(() => false);
  if (!titleVisible) {
    violations.push({
      contract: "page title visible during bootstrap",
      expected: "visible",
      found: "not visible",
      checkpoint,
      selector: LEADS_TITLE_SELECTOR,
    });
  }

  return violations;
}

/** Contract: one bootstrap shell, no fullscreen spinner, filter placeholder inside shell. */
export async function assertStableBootstrapShell(
  page: Page,
  checkpoint: BootstrapCheckpoint,
) {
  await expect(async () => {
    const violations = await inspectBootstrapShell(page, checkpoint);
    expect(
      violations,
      violations.length ? formatBootstrapViolations(violations) : undefined,
    ).toEqual([]);
  }).toPass({ timeout: 15_000 });
}

export async function installStaggeredBootstrapDelays(page: Page) {
  await page.route(/\/api\/subscription\/status/, async (route) => {
    await new Promise((r) => setTimeout(r, SUBSCRIPTION_DELAY_MS));
    await route.continue();
  });
  await page.route(/\/api\/leads\/all/, async (route) => {
    if (route.request().method() === "GET") {
      await new Promise((r) => setTimeout(r, LEADS_DELAY_MS));
    }
    await route.continue();
  });
}

export async function removeBootstrapDelays(page: Page) {
  await page.unroute(/\/api\/subscription\/status/);
  await page.unroute(/\/api\/leads\/all/);
}

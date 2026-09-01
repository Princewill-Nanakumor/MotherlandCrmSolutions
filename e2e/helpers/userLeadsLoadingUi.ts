import { expect, type Page } from "@playwright/test";
import {
  E2E_AGENT_EMAIL,
  apiJson,
} from "./auth";
import {
  importLeadsWithRetry,
  leadsDataTable,
  listUsers,
} from "./assignmentUi";

export const SUBSCRIPTION_DELAY_MS = 1_000;
export const LEADS_DELAY_MS = 2_500;
export const REFETCH_DELAY_MS = 1_500;
/** Cold dev compile + hydration can delay the bootstrap shell on first navigation. */
export const BOOTSTRAP_SHELL_TIMEOUT_MS = 60_000;

export type BootstrapCheckpoint =
  | "shell-visible"
  | "subscription-resolved-leads-pending"
  | "background-watch";

export type PostBootstrapCheckpoint =
  | "client-filter"
  | "client-pagination"
  | "refetch-in-flight"
  | "refetch-settled";

export type BootstrapViolation = {
  contract: string;
  expected: string;
  found: string;
  checkpoint: BootstrapCheckpoint | PostBootstrapCheckpoint;
  selector?: string;
};

export const BOOTSTRAP_SHELL_SELECTOR =
  '[data-testid="user-leads-bootstrap-shell"]';
export const TABLE_LOADING_SELECTOR =
  '[data-testid="user-leads-table-loading"]';
export const FILTER_LOADING_SELECTOR = '[aria-label="Loading filters"]';
export const FULLSCREEN_SPINNER_SELECTOR =
  'main [data-testid="fullscreen-loading-spinner"]';
export const LEADS_TITLE_SELECTOR = 'role=heading[name=/my leads/i]';

export const bootstrapShell = (page: Page) =>
  page.getByTestId("user-leads-bootstrap-shell");

export const tableLoadingSkeleton = (page: Page) =>
  page.getByTestId("user-leads-table-loading");

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
  const tableLoadingVisible = await tableLoadingSkeleton(page)
    .isVisible()
    .catch(() => false);

  if (checkpoint === "subscription-resolved-leads-pending") {
    if (shellVisible) {
      violations.push({
        contract: "bootstrap shell cleared after subscription resolves",
        expected: "not visible",
        found: "visible",
        checkpoint,
        selector: BOOTSTRAP_SHELL_SELECTOR,
      });
    }

    if (!tableLoadingVisible) {
      violations.push({
        contract: "layered table skeleton while assigned leads load",
        expected: "visible",
        found: "not visible",
        checkpoint,
        selector: TABLE_LOADING_SELECTOR,
      });
    }
  } else {
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
  }

  const filterShellCount = await filterLoadingShell(page).count();
  if (checkpoint === "subscription-resolved-leads-pending" && filterShellCount > 0) {
    violations.push({
      contract: "no generic filter shell after subscription resolves",
      expected: "0",
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
    .getByRole("heading", { name: /my leads/i })
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

export async function assertStableBootstrapShell(
  page: Page,
  checkpoint: BootstrapCheckpoint,
  options: { timeoutMs?: number } = {},
) {
  const timeoutMs = options.timeoutMs ?? BOOTSTRAP_SHELL_TIMEOUT_MS;
  await expect(async () => {
    const violations = await inspectBootstrapShell(page, checkpoint);
    expect(
      violations,
      violations.length ? formatBootstrapViolations(violations) : undefined,
    ).toEqual([]);
  }).toPass({ timeout: timeoutMs });
}

export async function clearUserLeadsRouteMocks(page: Page) {
  await page.unroute(/\/api\/subscription\/agent-status/).catch(() => undefined);
  await page.unroute(/\/api\/leads\/assigned/).catch(() => undefined);
}

export async function warmUpMyLeadsRoute(page: Page) {
  await page.goto("/dashboard/leads", {
    waitUntil: "domcontentloaded",
    timeout: BOOTSTRAP_SHELL_TIMEOUT_MS,
  });
  await expectMyLeadsHeading(page);
}

export async function expectMyLeadsHeading(page: Page) {
  await expect(page.getByRole("heading", { name: /my leads/i })).toBeVisible({
    timeout: BOOTSTRAP_SHELL_TIMEOUT_MS,
  });
}

/** Status filter is a real button once /api/statuses has resolved (pulse skeleton before that). */
export async function expectMyLeadsFiltersReady(page: Page) {
  await expectMyLeadsHeading(page);
  await expect(
    page.getByRole("button", { name: /all statuses/i }),
  ).toBeVisible({ timeout: BOOTSTRAP_SHELL_TIMEOUT_MS });
}

export async function installStaggeredBootstrapDelays(page: Page) {
  await page.route(/\/api\/subscription\/agent-status/, async (route) => {
    await new Promise((r) => setTimeout(r, SUBSCRIPTION_DELAY_MS));
    await route.continue();
  });
  await page.route(/\/api\/leads\/assigned/, async (route) => {
    if (route.request().method() === "GET") {
      await new Promise((r) => setTimeout(r, LEADS_DELAY_MS));
    }
    await route.continue();
  });
}

export async function removeBootstrapDelays(page: Page) {
  await clearUserLeadsRouteMocks(page);
}

/** Delays the next GET /api/leads/assigned after `arm()` is called. */
export async function installAssignedLeadsRefetchDelay(
  page: Page,
  options: { delayMs?: number } = {},
) {
  const delayMs = options.delayMs ?? REFETCH_DELAY_MS;
  const state = { armed: false };

  await page.route(/\/api\/leads\/assigned/, async (route) => {
    if (route.request().method() === "GET" && state.armed) {
      state.armed = false;
      await new Promise((r) => setTimeout(r, delayMs));
    }
    await route.continue();
  });

  return {
    arm: () => {
      state.armed = true;
    },
    remove: async () => {
      await page.unroute(/\/api\/leads\/assigned/).catch(() => undefined);
    },
  };
}

export async function inspectPostBootstrapUi(
  page: Page,
  checkpoint: PostBootstrapCheckpoint,
  options: { minVisibleRows?: number } = {},
): Promise<BootstrapViolation[]> {
  const violations: BootstrapViolation[] = [];

  const shellCount = await bootstrapShell(page).count();
  if (shellCount > 0) {
    violations.push({
      contract: "no bootstrap shell after initial load",
      expected: "0",
      found: String(shellCount),
      checkpoint,
      selector: BOOTSTRAP_SHELL_SELECTOR,
    });
  }

  const filterShellCount = await filterLoadingShell(page).count();
  if (filterShellCount > 0) {
    violations.push({
      contract: "no filter loading placeholder after bootstrap",
      expected: "0",
      found: String(filterShellCount),
      checkpoint,
      selector: FILTER_LOADING_SELECTOR,
    });
  }

  const tableLoadingCount = await tableLoadingSkeleton(page).count();
  if (tableLoadingCount > 0) {
    violations.push({
      contract: "no table loading skeleton after bootstrap",
      expected: "0",
      found: String(tableLoadingCount),
      checkpoint,
      selector: TABLE_LOADING_SELECTOR,
    });
  }

  const spinnerCount = await fullscreenLoadingSpinner(page).count();
  if (spinnerCount > 0) {
    violations.push({
      contract: "no fullscreen spinner in main after bootstrap",
      expected: "0",
      found: String(spinnerCount),
      checkpoint,
      selector: FULLSCREEN_SPINNER_SELECTOR,
    });
  }

  const titleVisible = await page
    .getByRole("heading", { name: /my leads/i })
    .isVisible()
    .catch(() => false);
  if (!titleVisible) {
    violations.push({
      contract: "page title visible after bootstrap",
      expected: "visible",
      found: "not visible",
      checkpoint,
      selector: LEADS_TITLE_SELECTOR,
    });
  }

  if (options.minVisibleRows !== undefined) {
    const rowCount = await leadsDataTable(page).locator("tbody tr").count();
    if (rowCount < options.minVisibleRows) {
      violations.push({
        contract: "table rows remain visible during post-bootstrap interaction",
        expected: `>= ${options.minVisibleRows}`,
        found: String(rowCount),
        checkpoint,
      });
    }
  }

  return violations;
}

export async function assertStablePostBootstrapUi(
  page: Page,
  checkpoint: PostBootstrapCheckpoint,
  options: { minVisibleRows?: number } = {},
) {
  await expect(async () => {
    const violations = await inspectPostBootstrapUi(page, checkpoint, options);
    expect(
      violations,
      violations.length ? formatBootstrapViolations(violations) : undefined,
    ).toEqual([]);
  }).toPass({ timeout: 10_000 });
}

export async function seedAssignedLeadsForAgent(
  adminPage: Page,
  totalCount: number,
  stamp: number,
  options: { assignCount?: number } = {},
): Promise<{ leadIds: string[]; agentId: string }> {
  await adminPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const assignCount = options.assignCount ?? totalCount;
  const users = await listUsers(adminPage);
  const agent = users.find((u) => u.email === E2E_AGENT_EMAIL);
  expect(agent, `missing ${E2E_AGENT_EMAIL}`).toBeTruthy();
  const agentId = String(agent!.id || agent!._id);

  const payload = Array.from({ length: totalCount }, (_, i) => ({
    name: `User Leads Loading ${stamp} ${i}`,
    email: `user-leads.loading.${stamp}.${i}@e2e.motherland.test`,
    phone: `+1555${String(7_000_000 + i).slice(0, 7)}`,
    source: "user-leads-loading-e2e",
    country: "United States",
  }));

  const imported = await importLeadsWithRetry(adminPage, payload);
  expect(imported.status).toBe(200);

  const search = `user-leads.loading.${stamp}`;
  const leadIds: string[] = [];
  const list = await apiJson(
    adminPage,
    `/api/leads/all?search=${encodeURIComponent(search)}&pageSize=${totalCount}`,
  );
  expect(list.status).toBe(200);
  const rows =
    (list.body as { leads?: Array<{ _id: string }> }).leads || [];
  for (const row of rows) {
    if (row._id) leadIds.push(row._id);
  }
  expect(leadIds.length).toBeGreaterThanOrEqual(totalCount);
  expect(assignCount).toBeLessThanOrEqual(leadIds.length);

  const assign = await apiJson(adminPage, "/api/leads/assign", {
    method: "POST",
    body: JSON.stringify({
      leadIds: leadIds.slice(0, assignCount),
      userId: agentId,
    }),
  });
  expect(assign.status).toBe(200);

  return { leadIds, agentId };
}

export async function triggerAssignedLeadsRefetch(page: Page) {
  await page.evaluate(async () => {
    const refetch = (
      window as Window & {
        __e2eRefetchAssignedLeads?: () => Promise<unknown>;
      }
    ).__e2eRefetchAssignedLeads;
    if (!refetch) {
      throw new Error(
        "Missing window.__e2eRefetchAssignedLeads (dev-only UserLeadsContent hook)",
      );
    }
    await refetch();
  });
}

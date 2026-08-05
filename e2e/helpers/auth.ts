import { expect, type Page } from "@playwright/test";

export const E2E_ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL || "e2e-admin@motherland.test";
export const E2E_AGENT_EMAIL =
  process.env.E2E_AGENT_EMAIL || "e2e-agent@motherland.test";
export const E2E_PASSWORD = process.env.E2E_PASSWORD || "E2eTest1!";

/** Serializable fetch options for Playwright `page.evaluate` (no streams/Headers). */
export type ApiJsonInit = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

/** Login via UI, solving the captcha from the displayed digits. */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/email address/i).fill(email);
  await page.getByPlaceholder(/^password$/i).fill(password);

  await page.getByRole("button", { name: /i.?m not a robot/i }).click();

  const captchaBox = page.locator("[data-auth-captcha] .font-mono").first();
  await expect(captchaBox).toBeVisible({ timeout: 20_000 });
  const masked = (await captchaBox.innerText()).trim();
  const code = masked.replace(/\D/g, "");
  expect(code.length).toBe(6);

  await page.locator("#login-captcha-input").fill(code);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
}

export async function apiJson(
  page: Page,
  path: string,
  init?: ApiJsonInit,
): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ path: p, init: i }) => {
      const res = await fetch(p, {
        method: i?.method,
        body: i?.body,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(i?.headers ?? {}),
        },
      });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { status: res.status, body };
    },
    { path, init },
  );
}

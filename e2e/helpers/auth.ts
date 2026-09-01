import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const E2E_ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL || "e2e-admin@motherland.test";
export const E2E_AGENT_EMAIL =
  process.env.E2E_AGENT_EMAIL || "e2e-agent@motherland.test";
export const E2E_AGENT_B_EMAIL =
  process.env.E2E_AGENT_B_EMAIL || "e2e-agent-b@motherland.test";
export const E2E_PASSWORD = process.env.E2E_PASSWORD || "E2eTest1!";

/** Serializable fetch options for Playwright `page.evaluate` (no streams/Headers). */
export type ApiJsonInit = {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
};

const LOGIN_URL = "/login?callbackUrl=%2Fdashboard";
const DEFAULT_AUTH_STORAGE = path.join(process.cwd(), "e2e", ".auth-admin.json");
/** Reuse saved session cookies when younger than this (dev JWT is typically longer). */
const AUTH_STORAGE_MAX_AGE_MS = 30 * 60 * 1000;

function captchaDigitsFromMasked(masked: string): string {
  const code = masked.replace(/\D/g, "");
  expect(code.length).toBe(6);
  return code;
}

async function assertAuthenticated(page: Page) {
  const meRes = await page.request.get("/api/users/me");
  expect(meRes.ok(), `GET /api/users/me after login: ${meRes.status()}`).toBeTruthy();
}

/**
 * Sign in via NextAuth HTTP endpoints (csrf + captcha-issue + credentials callback).
 * Skips the login page, robot button, and client hydration — typically much faster than `loginAs`.
 */
export async function loginAsApi(page: Page, email: string, password: string) {
  await page.context().clearCookies();

  const csrfRes = await page.request.get("/api/auth/csrf");
  expect(csrfRes.ok(), `csrf: ${csrfRes.status()}`).toBeTruthy();
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const captchaRes = await page.request.get("/api/auth/captcha-issue");
  expect(
    captchaRes.ok(),
    `captcha-issue: ${captchaRes.status()}`,
  ).toBeTruthy();
  const { masked } = (await captchaRes.json()) as { masked: string };
  const captcha = captchaDigitsFromMasked(masked);

  const signInRes = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password,
      captcha,
      json: "true",
      redirect: "false",
    },
  });

  const signInStatus = signInRes.status();
  const signInBody = await signInRes.text();
  expect(
    signInStatus === 200 || signInStatus === 302,
    `credentials callback: ${signInStatus} ${signInBody.slice(0, 300)}`,
  ).toBeTruthy();

  if (signInStatus === 200) {
    try {
      const parsed = JSON.parse(signInBody) as { error?: string };
      expect(parsed.error, `signIn error: ${parsed.error}`).toBeFalsy();
    } catch {
      /* non-JSON 200 is fine when session cookies were set */
    }
  }

  await assertAuthenticated(page);
}

async function tryRestoreAuthStorage(
  page: Page,
  storagePath: string,
): Promise<boolean> {
  if (!fs.existsSync(storagePath)) return false;
  const ageMs = Date.now() - fs.statSync(storagePath).mtimeMs;
  if (ageMs > AUTH_STORAGE_MAX_AGE_MS) return false;

  const state = JSON.parse(fs.readFileSync(storagePath, "utf8")) as {
    cookies?: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      expires: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None";
    }>;
  };
  if (!state.cookies?.length) return false;

  await page.context().clearCookies();
  await page.context().addCookies(state.cookies);

  const meRes = await page.request.get("/api/users/me");
  if (!meRes.ok()) {
    await page.context().clearCookies();
    return false;
  }
  return true;
}

/**
 * Fast login for perf-sensitive E2E: reuse cached storage state when valid, else `loginAsApi`.
 * Set `E2E_AUTH_STORAGE=0` to disable cache; override path with `E2E_AUTH_STORAGE=/path/to.json`.
 */
export async function loginAsFast(page: Page, email: string, password: string) {
  if (process.env.E2E_AUTH_STORAGE !== "0") {
    const storagePath = process.env.E2E_AUTH_STORAGE || DEFAULT_AUTH_STORAGE;
    if (await tryRestoreAuthStorage(page, storagePath)) return;
    await loginAsApi(page, email, password);
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    await page.context().storageState({ path: storagePath });
    return;
  }
  await loginAsApi(page, email, password);
}

/** Open login with a clean cookie jar; tolerate auth redirect races on /login. */
async function openLoginPage(page: Page) {
  await page.context().clearCookies();

  try {
    const response = await page.goto(LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (response && !response.ok()) {
      expect(
        response.ok(),
        "Login page did not load — stop any hung dev server and re-run (or use PLAYWRIGHT_FRESH_SERVER=1 PLAYWRIGHT_PORT=3001).",
      ).toBeTruthy();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const onLogin = /\/login/.test(page.url());
    if (!onLogin && !/interrupted/i.test(msg)) {
      throw err;
    }
  }

  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  await expect(page.getByPlaceholder(/email address/i)).toBeVisible({
    timeout: 30_000,
  });
}

/** Login via UI, solving the captcha from the displayed digits. Retries once on flake. */
export async function loginAs(page: Page, email: string, password: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await openLoginPage(page);

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

      try {
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
      } catch {
        const onLogin = /\/login/.test(page.url());
        const prodHint =
          onLogin && process.env.LEADS_BENCH_RUNTIME === "production"
            ? " For local `next start`, NEXTAUTH_URL must be http://127.0.0.1:<port> (not :3000 from .env)."
            : "";
        throw new Error(
          `Login did not reach /dashboard — stuck at ${page.url()}.${prodHint}`,
        );
      }
      return;
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        await page.waitForTimeout(1_500);
      }
    }
  }
  throw lastError;
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

import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/** Load repo .env so MONGODB_URI / E2E_* are available to globalSetup + tests. */
function loadRepoEnv() {
  // Playwright may load this config as CJS — avoid import.meta.
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
    return;
  }
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadRepoEnv();

const port = process.env.PLAYWRIGHT_PORT || "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const isRemote = !/127\.0\.0\.1|localhost/.test(baseURL);
/** Bench scripts start their own Next on another port. */
const skipWebServer =
  isRemote || process.env.PLAYWRIGHT_NO_WEBSERVER === "1";
/** Set CI=1 or PLAYWRIGHT_FRESH_SERVER=1 to start a new dev server (avoids a hung :3000). */
const reuseExistingServer =
  !process.env.CI &&
  process.env.PLAYWRIGHT_FRESH_SERVER !== "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.mjs",
  timeout: 120_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 30_000,
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: `npm run dev -- --port ${port}`,
          url: baseURL,
          reuseExistingServer,
          timeout: 120_000,
          env: {
            ...process.env,
            E2E_RELAX_RATE_LIMITS: "1",
          },
        },
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadRepoEnv() {
  const envPath = path.join(root, ".env");
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

export default async function globalSetup() {
  loadRepoEnv();

  const needsSeed =
    process.env.IMPORT_BROWSER_PRESSURE === "1" ||
    process.env.IMPORT_HTTP_SOAK === "1";

  if (!process.env.MONGODB_URI) {
    if (needsSeed) {
      throw new Error(
        "[e2e] MONGODB_URI is required for import browser pressure / HTTP soak. " +
          "Ensure .env exists (npm run test:e2e:seed also needs it).",
      );
    }
    console.log(
      "[e2e] Skipping seed: MONGODB_URI is not set (smoke CI can still run).",
    );
    return;
  }

  // Free disposable load/E2E rows before seed (Atlas free-tier often fills up).
  try {
    execFileSync(
      "node",
      ["--env-file=.env", "scripts/e2e-cleanup-disposable.mjs"],
      { cwd: root, stdio: "inherit" },
    );
  } catch (err) {
    console.warn(
      "[e2e] Cleanup failed (continuing to seed):",
      err instanceof Error ? err.message : err,
    );
  }

  execFileSync("node", ["--env-file=.env", "scripts/e2e-seed.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
}

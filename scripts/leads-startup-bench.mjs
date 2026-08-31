#!/usr/bin/env node
/**
 * Run leads startup benchmark in dev and/or production.
 *
 *   node scripts/leads-startup-bench.mjs           # dev + prod
 *   node scripts/leads-startup-bench.mjs --dev-only
 *   node scripts/leads-startup-bench.mjs --prod-only
 *   LEADS_FILTER_BENCH_SIZE=200 node scripts/leads-startup-bench.mjs
 */
import { spawn, execSync } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const devOnly = args.includes("--dev-only");
const prodOnly = args.includes("--prod-only");
const freshDev = args.includes("--fresh-dev");
const size = process.env.LEADS_FILTER_BENCH_SIZE || "100";
const prodPort = process.env.LEADS_BENCH_PROD_PORT || "3001";

function benchBaseUrl(port = prodPort) {
  return `http://127.0.0.1:${port}`;
}

/** Env so NextAuth session cookies work on local http://127.0.0.1 bench servers. */
function benchAuthEnv(port = prodPort) {
  const baseURL = benchBaseUrl(port);
  return {
    NEXTAUTH_URL: baseURL,
    NEXT_PUBLIC_APP_URL: baseURL,
    E2E_RELAX_RATE_LIMITS: "1",
    LEADS_FILTER_BENCH: "1",
    API_PERF_TIMING: "1",
  };
}

function run(cmd, env = {}) {
  execSync(cmd, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function waitForUrl(url, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      fetch(url)
        .then((r) => {
          if (r.ok || r.status < 500) resolve();
          else if (Date.now() > deadline) reject(new Error(`Timeout: ${url}`));
          else setTimeout(tick, 500);
        })
        .catch(() => {
          if (Date.now() > deadline) reject(new Error(`Timeout: ${url}`));
          else setTimeout(tick, 500);
        });
    };
    tick();
  });
}

async function runPlaywright(env) {
  run(
    `npx playwright test e2e/leads-startup-bench.spec.ts`,
    {
      LEADS_BENCH_STARTUP: "1",
      LEADS_FILTER_BENCH: "1",
      LEADS_FILTER_BENCH_SIZE: size,
      API_PERF_TIMING: "1",
      ...env,
    },
  );
}

async function runProd() {
  const authEnv = benchAuthEnv();

  console.log("\n=== Production: npm run build ===\n");
  console.log(`Using NEXTAUTH_URL=${authEnv.NEXTAUTH_URL}\n`);
  run("npm run build", authEnv);

  console.log(`\n=== Production: next start on :${prodPort} ===\n`);
  const server = spawn(
    "npm",
    ["run", "start", "--", "-p", prodPort],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production", ...authEnv },
    },
  );

  const rl = createInterface({ input: server.stdout });
  rl.on("line", (line) => {
    process.stdout.write(`${line}\n`);
  });
  server.stderr.on("data", (d) => process.stderr.write(d));

  const baseURL = authEnv.NEXTAUTH_URL;
  try {
    await waitForUrl(`${baseURL}/login`);
    await runPlaywright({
      LEADS_BENCH_RUNTIME: "production",
      PLAYWRIGHT_BASE_URL: baseURL,
      PLAYWRIGHT_NO_WEBSERVER: "1",
      ...authEnv,
    });
  } finally {
    server.kill("SIGTERM");
    rl.close();
  }
}

async function main() {
  if (!prodOnly) {
    console.log("\n=== Development startup bench ===\n");
    if (freshDev) {
      await runPlaywright({
        LEADS_BENCH_RUNTIME: "development",
        PLAYWRIGHT_FRESH_SERVER: "1",
        PLAYWRIGHT_PORT: prodPort,
        ...benchAuthEnv(prodPort),
      });
    } else {
      await runPlaywright({
        LEADS_BENCH_RUNTIME: "development",
      });
    }
  }

  if (!devOnly) {
    await runProd();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

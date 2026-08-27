/**
 * Before/after HTTP import bench on a dedicated Next port (default 3010).
 *
 * Legacy: 1k chunks, 5 chunks/tick, per-chunk quota
 * Optimized: 5k chunks, 100 chunks/tick, job-level quota
 *
 *   node --env-file=.env scripts/import-http-bench-compare.mjs
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.IMPORT_HTTP_BENCH_PORT || 3010);
const size = Number(process.env.IMPORT_SOAK_SIZE || 50_000);
const baseURL = `http://127.0.0.1:${port}`;

const PROFILES = {
  before: {
    label: "before (1k chunks, drain=5, per-chunk quota)",
    env: {
      IMPORT_CLIENT_CHUNK_SIZE: "1000",
      IMPORT_WORKER_CHUNKS: "5",
      IMPORT_CHUNK_QUOTA: "per-chunk",
      IMPORT_PERF_STATS: "1",
      IMPORT_WORKER_LEASE_MS: "120000",
      IMPORT_STAGE_AUTO_KICK: "0",
    },
  },
  after: {
    label: "after (5k chunks, drain=100, job quota)",
    env: {
      IMPORT_CLIENT_CHUNK_SIZE: "5000",
      IMPORT_WORKER_CHUNKS: "100",
      IMPORT_CHUNK_QUOTA: "job",
      IMPORT_PERF_STATS: "1",
      IMPORT_WORKER_LEASE_MS: "600000",
      IMPORT_STAGE_AUTO_KICK: "0",
    },
  },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function portFree(p) {
  return new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(p, "127.0.0.1");
  });
}

async function waitForUrl(url, timeoutMs = 180_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status > 0) return;
    } catch {
      // retry
    }
    await sleep(1000);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

function run(cmd, args, env, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      out += s;
      process.stdout.write(`[${label}] ${s}`);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      out += s;
      process.stderr.write(`[${label}] ${s}`);
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve({ code, out }));
  });
}

function parseReport(out) {
  const marker = "=== HTTP soak report ===";
  const idx = out.lastIndexOf(marker);
  if (idx < 0) return null;
  const after = out.slice(idx + marker.length).trim();
  const start = after.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < after.length; i++) {
    if (after[i] === "{") depth += 1;
    if (after[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  try {
    return JSON.parse(after.slice(start, end));
  } catch {
    return null;
  }
}

async function runProfile(key) {
  const profile = PROFILES[key];
  if (!(await portFree(port))) {
    throw new Error(
      `Port ${port} is busy. Stop other servers or set IMPORT_HTTP_BENCH_PORT.`,
    );
  }

  console.log(`\n======== ${profile.label} ========`);
  const nextEnv = {
    ...profile.env,
    PORT: String(port),
  };
  const next = spawn(
    "npx",
    ["next", "dev", "--port", String(port), "--hostname", "127.0.0.1"],
    {
      cwd: root,
      env: { ...process.env, ...nextEnv },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  next.stdout.on("data", (d) => process.stdout.write(`[next-${key}] ${d}`));
  next.stderr.on("data", (d) => process.stderr.write(`[next-${key}] ${d}`));

  try {
    await waitForUrl(baseURL);
    const pw = await run(
      "npx",
      [
        "playwright",
        "test",
        "e2e/import-http-soak.spec.ts",
        "--reporter=list",
      ],
      {
        ...profile.env,
        IMPORT_HTTP_SOAK: "1",
        IMPORT_SOAK_SIZE: String(size),
        PLAYWRIGHT_BASE_URL: baseURL,
        PLAYWRIGHT_NO_WEBSERVER: "1",
      },
      `pw-${key}`,
    );
    const report = parseReport(pw.out);
    if (!report || pw.code !== 0) {
      throw new Error(
        `${key} soak failed (exit ${pw.code}). Report parsed: ${Boolean(report)}`,
      );
    }
    return report;
  } finally {
    next.kill("SIGTERM");
    await sleep(2000);
    try {
      next.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
}

function row(label, before, after, fmt = (n) => n) {
  const b = before ?? "—";
  const a = after ?? "—";
  let delta = "—";
  if (typeof before === "number" && typeof after === "number" && before !== 0) {
    const pct = ((after - before) / before) * 100;
    delta = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  }
  console.log(
    `${label.padEnd(22)} ${String(fmt(b)).padStart(12)} ${String(fmt(a)).padStart(12)} ${delta.padStart(10)}`,
  );
}

async function main() {
  console.log(`HTTP import bench compare — size=${size} port=${port}`);
  const before = await runProfile("before");
  const after = await runProfile("after");

  console.log("\n======== BEFORE / AFTER ========");
  console.log(
    `${"metric".padEnd(22)} ${"before".padStart(12)} ${"after".padStart(12)} ${"delta".padStart(10)}`,
  );
  row("stageMs", before.stageMs, after.stageMs);
  row("workerMs", before.workerMs, after.workerMs);
  row("totalMs", before.totalMs, after.totalMs);
  row("leads/sec total", before.leadsPerSecTotal, after.leadsPerSecTotal);
  row("leads/sec worker", before.leadsPerSecWorker, after.leadsPerSecWorker);
  row(
    "mongo round trips",
    before.mongo?.roundTrips,
    after.mongo?.roundTrips,
  );
  row("bulkWrites", before.mongo?.bulkWrites, after.mongo?.bulkWrites);
  row("quotaChecks", before.mongo?.quotaChecks, after.mongo?.quotaChecks);
  row("emailFinds", before.mongo?.emailFinds, after.mongo?.emailFinds);
  row("reconciles", before.mongo?.reconciles, after.mongo?.reconciles);
  row("stage chunks", before.profile?.chunkTotal, after.profile?.chunkTotal);
  row("worker ticks", before.workerTicks, after.workerTicks);

  console.log("\nRaw before:", JSON.stringify(before, null, 2));
  console.log("\nRaw after:", JSON.stringify(after, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

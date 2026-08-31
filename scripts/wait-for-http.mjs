/**
 * Poll until an HTTP URL responds (for prod E2E when PLAYWRIGHT_NO_WEBSERVER=1).
 *
 *   WAIT_FOR_URL=http://127.0.0.1:3000/api/health node scripts/wait-for-http.mjs
 */
const url = process.env.WAIT_FOR_URL || "http://127.0.0.1:3000/api/health";
const maxMs = Number(process.env.WAIT_FOR_MAX_MS || 120_000);
const t0 = Date.now();

while (Date.now() - t0 < maxMs) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      console.log(
        JSON.stringify({ ok: true, url, waitMs: Date.now() - t0 }),
      );
      process.exit(0);
    }
  } catch {
    // server not up yet
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}

console.error(
  JSON.stringify({
    ok: false,
    url,
    waitMs: Date.now() - t0,
    hint: "Start the server first: npm run build && npm run start",
  }),
);
process.exit(1);

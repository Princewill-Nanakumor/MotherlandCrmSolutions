import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export default async function globalSetup() {
  if (!process.env.MONGODB_URI) {
    console.log(
      "[e2e] Skipping seed: MONGODB_URI is not set (smoke CI can still run).",
    );
    return;
  }

  execFileSync("node", ["--env-file=.env", "scripts/e2e-seed.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
}

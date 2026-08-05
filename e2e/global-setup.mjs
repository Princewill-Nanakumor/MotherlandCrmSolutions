import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

export default async function globalSetup() {
  execFileSync("node", ["--env-file=.env", "scripts/e2e-seed.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
}

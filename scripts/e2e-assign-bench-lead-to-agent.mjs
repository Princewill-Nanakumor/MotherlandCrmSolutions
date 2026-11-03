/**
 * Assign the lead from e2e/.lead-detail-bench.json to the E2E agent.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL || "e2e-agent@motherland.test";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const metaPath = path.join(root, "e2e", ".lead-detail-bench.json");

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`Missing ${metaPath} — run e2e-seed-lead-detail-bench first`);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

  await mongoose.connect(uri, { dbName: getDbName() });
  const db = mongoose.connection.db;
  if (!db) throw new Error("no db");

  const agent = await db.collection("users").findOne({ email: AGENT_EMAIL });
  if (!agent?._id) throw new Error(`agent not found: ${AGENT_EMAIL}`);

  const leadId = new mongoose.Types.ObjectId(meta.leadId);
  await db.collection("leads").updateOne(
    { _id: leadId },
    { $set: { assignedTo: agent._id, updatedAt: new Date() } },
  );

  console.log(
    JSON.stringify({
      ok: true,
      leadId: meta.leadId,
      assignedTo: String(agent._id),
      agentEmail: AGENT_EMAIL,
    }),
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

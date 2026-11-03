/**
 * Seed filler leads + one target lead for panel open/close vs table row-count.
 *
 *   node --env-file=.env scripts/e2e-seed-panel-rowcount-bench.mjs
 *
 * Env:
 *   PANEL_ROWCOUNT_FILLER=999   (default) → total rows with target ≈ 1000
 * Writes e2e/.panel-rowcount-bench.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e-admin@motherland.test";
const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL || "e2e-agent@motherland.test";
const ASSIGN_AGENT =
  process.env.PANEL_ROWCOUNT_ASSIGN_AGENT === "1" ||
  process.env.PANEL_ROWCOUNT_ASSIGN_AGENT === "true";
const FILLER = Math.min(
  2000,
  Math.max(0, Number(process.env.PANEL_ROWCOUNT_FILLER || 999)),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const metaPath = path.join(root, "e2e", ".panel-rowcount-bench.json");

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri, { dbName: getDbName() });
  const db = mongoose.connection.db;
  if (!db) throw new Error("no db");

  const users = db.collection("users");
  const admin = await users.findOne({ email: ADMIN_EMAIL });
  if (!admin?._id) {
    throw new Error(`E2E admin not found (${ADMIN_EMAIL}). Run npm run test:e2e:seed`);
  }
  const adminId = admin._id;
  let assignedTo = undefined;
  if (ASSIGN_AGENT) {
    const agent = await users.findOne({ email: AGENT_EMAIL });
    if (!agent?._id) {
      throw new Error(
        `E2E agent not found (${AGENT_EMAIL}). Run npm run test:e2e:seed`,
      );
    }
    assignedTo = agent._id;
  }
  const stamp = Date.now();
  const source = `e2e-panel-rowcount-${stamp}`;
  const targetEmail = `e2e.panel.rowcount.target.${stamp}@motherland.test`;

  const leads = db.collection("leads");
  const comments = db.collection("comments");

  // Clean prior rowcount benches for this tenant.
  const old = await leads
    .find({ adminId, source: /^e2e-panel-rowcount-/i })
    .project({ _id: 1 })
    .toArray();
  if (old.length) {
    const ids = old.map((l) => l._id);
    await Promise.all([
      comments.deleteMany({ leadId: { $in: ids } }),
      leads.deleteMany({ _id: { $in: ids } }),
    ]);
  }

  const now = Date.now();
  // Target first so it sorts to the top of lastActivityAt desc pages.
  const targetDoc = {
    firstName: "E2E",
    lastName: `RowCount Target ${stamp}`,
    email: targetEmail,
    phone: "+15550009999",
    country: "United States",
    source,
    adminId,
    ...(assignedTo ? { assignedTo } : {}),
    status: "new",
    createdAt: new Date(now),
    updatedAt: new Date(now),
    lastActivityAt: new Date(now + 60_000),
  };

  const fillerDocs = Array.from({ length: FILLER }, (_, i) => ({
    firstName: "E2E",
    lastName: `RowCount Filler ${i}`,
    email: `e2e.panel.rowcount.${stamp}.${i}@motherland.test`,
    phone: `+1555${String(9000000 + i).slice(0, 7)}`,
    country: "United States",
    source,
    adminId,
    ...(assignedTo ? { assignedTo } : {}),
    status: "new",
    createdAt: new Date(now - i * 1000),
    updatedAt: new Date(now - i * 1000),
    lastActivityAt: new Date(now - i * 1000),
  }));

  const t0 = Date.now();
  const targetInsert = await leads.insertOne(targetDoc);
  const batch = 250;
  for (let i = 0; i < fillerDocs.length; i += batch) {
    await leads.insertMany(fillerDocs.slice(i, i + batch), { ordered: false });
  }

  await comments.insertOne({
    leadId: targetInsert.insertedId,
    adminId,
    content: "e2e.panel.rowcount.comment.0 — open/close rowcount seed",
    createdBy: {
      _id: String(adminId),
      firstName: admin.firstName || "E2E",
      lastName: admin.lastName || "Admin",
    },
    createdAt: new Date(now),
    updatedAt: new Date(now),
  });

  const meta = {
    stamp,
    source,
    email: targetEmail,
    leadId: String(targetInsert.insertedId),
    fillerCount: FILLER,
    totalLeads: FILLER + 1,
    assignedToAgent: ASSIGN_AGENT,
    agentEmail: ASSIGN_AGENT ? AGENT_EMAIL : null,
    seedMs: Date.now() - t0,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(JSON.stringify({ ok: true, ...meta }));
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

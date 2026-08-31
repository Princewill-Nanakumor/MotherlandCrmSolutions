/**
 * Seed one lead with a large comments + activities + reminders set for panel bench.
 *
 *   node --env-file=.env scripts/e2e-seed-lead-detail-bench.mjs
 *
 * Writes e2e/.lead-detail-bench.json with { leadId, email, stamp, counts }.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e-admin@motherland.test";
const COMMENT_COUNT = Math.min(
  500,
  Math.max(0, Number(process.env.LEAD_DETAIL_BENCH_COMMENTS || 100)),
);
const ACTIVITY_COUNT = Math.min(
  100,
  Math.max(0, Number(process.env.LEAD_DETAIL_BENCH_ACTIVITIES || 100)),
);
const REMINDER_COUNT = Math.min(
  50,
  Math.max(0, Number(process.env.LEAD_DETAIL_BENCH_REMINDERS || 10)),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const metaPath = path.join(root, "e2e", ".lead-detail-bench.json");

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

function batchInsert(collection, docs, batchSize = 250) {
  const ops = [];
  for (let i = 0; i < docs.length; i += batchSize) {
    ops.push(collection.insertMany(docs.slice(i, i + batchSize), { ordered: false }));
  }
  return Promise.all(ops);
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
  const actorId = admin._id;

  const stamp = Date.now();
  const email = `e2e.lead.detail.bench.${stamp}@motherland.test`;

  const leads = db.collection("leads");
  const comments = db.collection("comments");
  const activities = db.collection("activities");
  const reminders = db.collection("reminders");

  // Remove prior bench leads for this tenant.
  const oldLeads = await leads
    .find({ adminId, email: /^e2e\.lead\.detail\.bench\./i })
    .project({ _id: 1 })
    .toArray();
  if (oldLeads.length) {
    const oldIds = oldLeads.map((l) => l._id);
    await Promise.all([
      comments.deleteMany({ leadId: { $in: oldIds } }),
      activities.deleteMany({ leadId: { $in: oldIds } }),
      reminders.deleteMany({ leadId: { $in: oldIds } }),
      leads.deleteMany({ _id: { $in: oldIds } }),
    ]);
  }

  const now = Date.now();
  const leadInsert = await leads.insertOne({
    firstName: "E2E",
    lastName: `DetailBench ${stamp}`,
    email,
    phone: "+15550008888",
    country: "United States",
    source: "e2e-detail-bench",
    adminId,
    status: "new",
    createdAt: new Date(now),
    updatedAt: new Date(now),
    lastActivityAt: new Date(now),
  });
  const leadId = leadInsert.insertedId;

  const createdBy = {
    _id: String(adminId),
    firstName: admin.firstName || "E2E",
    lastName: admin.lastName || "Admin",
  };

  const commentDocs = Array.from({ length: COMMENT_COUNT }, (_, i) => {
    const t = new Date(now - i * 60_000);
    return {
      leadId,
      adminId,
      content: `e2e.bench.comment.${i} — detail panel timeline seed`,
      createdBy,
      createdAt: t,
      updatedAt: t,
    };
  });

  const activityDocs = Array.from({ length: ACTIVITY_COUNT }, (_, i) => {
    const t = new Date(now - i * 45_000 - 30_000);
    return {
      leadId,
      adminId,
      userId: actorId,
      type: "STATUS_CHANGE",
      details: `Status changed from New to Contacted (bench ${i})`,
      timestamp: t,
      updatedAt: t,
      metadata: {
        oldStatus: "New",
        newStatus: "Contacted",
        oldStatusId: "new",
        newStatusId: "contacted",
        performedBy: createdBy,
      },
    };
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const reminderDocs = Array.from({ length: REMINDER_COUNT }, (_, i) => {
    const t = new Date(now - i * 120_000);
    return {
      leadId,
      adminId,
      createdBy: actorId,
      assignedTo: actorId,
      title: `e2e.bench.reminder.${i}`,
      description: `E2E detail bench reminder ${i}`,
      reminderDate: tomorrow,
      reminderTime: "10:00",
      timezone: "UTC",
      type: "TASK",
      status: "PENDING",
      notificationSent: false,
      soundEnabled: true,
      createdAt: t,
      updatedAt: t,
    };
  });

  const tSeed = performance.now();
  await batchInsert(comments, commentDocs);
  await batchInsert(activities, activityDocs);
  if (reminderDocs.length) await batchInsert(reminders, reminderDocs);
  const seedMs = performance.now() - tSeed;

  const meta = {
    ok: true,
    stamp,
    leadId: String(leadId),
    email,
    adminId: String(adminId),
    counts: {
      comments: COMMENT_COUNT,
      activities: ACTIVITY_COUNT,
      reminders: REMINDER_COUNT,
      timelineExpected: COMMENT_COUNT + Math.min(ACTIVITY_COUNT, 100),
    },
    seedMs: Math.round(seedMs),
  };

  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(JSON.stringify(meta));
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

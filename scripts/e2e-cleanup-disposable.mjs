/**
 * Remove disposable load / E2E / bench data from MongoDB.
 * Keeps seeded E2E users (e2e-admin@motherland.test, agents); deletes test leads and harness imports.
 *
 *   npm run test:e2e:cleanup
 *   node --env-file=.env scripts/e2e-cleanup-disposable.mjs
 */
import mongoose from "mongoose";

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

/** Leads created by E2E, import load harness, or bulk assign benches. */
function disposableLeadFilter() {
  return {
    $or: [
      { email: { $regex: /@e2e\.motherland\.test$/i } },
      { email: { $regex: /^e2e\.lead\./i } },
      { source: { $regex: /^e2e-detail/i } },
      { email: { $regex: /@import-load\.motherland\.test$/i } },
      { source: { $regex: /^assign-bulk/i } },
      { source: { $in: ["assign-bulk-ui", "assign-bulk-bench"] } },
    ],
  };
}

function disposableImportFilter() {
  return {
    $or: [
      { fileName: { $regex: /^soak-/i } },
      { fileName: { $regex: /^concurrent-/i } },
      { fileName: { $regex: /^same-tenant-/i } },
      { fileName: { $regex: /^load-harness-/i } },
      { fileName: { $regex: /pressure/i } },
      { fileName: { $regex: /http-soak/i } },
      { fileName: { $regex: /assign-bulk/i } },
    ],
  };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri, { dbName: getDbName() });
  const db = mongoose.connection.db;
  if (!db) throw new Error("No db");

  const leads = db.collection("leads");
  const imports = db.collection("imports");
  const staging = db.collection("importstagingchunks");
  const users = db.collection("users");
  const activities = db.collection("activities");
  const comments = db.collection("comments");
  const callLogs = db.collection("calllogs");
  const reminders = db.collection("reminders");

  const leadFilter = disposableLeadFilter();
  const leadCountBefore = await leads.countDocuments(leadFilter);

  const leadIdDocs = await leads
    .find(leadFilter, { projection: { _id: 1 } })
    .toArray();
  const leadIds = leadIdDocs.map((d) => d._id);

  let activitiesDeleted = 0;
  let commentsDeleted = 0;
  let callLogsDeleted = 0;
  let remindersDeleted = 0;

  if (leadIds.length > 0) {
    const [act, com, calls, rems] = await Promise.all([
      activities.deleteMany({ leadId: { $in: leadIds } }),
      comments.deleteMany({ leadId: { $in: leadIds } }),
      callLogs.deleteMany({ leadId: { $in: leadIds } }),
      reminders.deleteMany({ leadId: { $in: leadIds } }),
    ]);
    activitiesDeleted = act.deletedCount || 0;
    commentsDeleted = com.deletedCount || 0;
    callLogsDeleted = calls.deletedCount || 0;
    remindersDeleted = rems.deletedCount || 0;
  }

  const leadResult = await leads.deleteMany(leadFilter);

  const importFilter = disposableImportFilter();
  const importDocs = await imports
    .find(importFilter, { projection: { _id: 1 } })
    .toArray();
  const importIds = importDocs.map((d) => d._id);

  let stagingDeleted = 0;
  if (importIds.length > 0) {
    const st = await staging.deleteMany({ importId: { $in: importIds } });
    stagingDeleted = st.deletedCount || 0;
  }

  const importResult = await imports.deleteMany(importFilter);

  const loadUsers = await users.deleteMany({
    email: { $regex: /@import-load\.motherland\.test$/i },
  });

  const report = {
    ok: true,
    db: getDbName(),
    leadsMatched: leadCountBefore,
    leadsDeleted: leadResult.deletedCount || 0,
    activitiesDeleted,
    commentsDeleted,
    callLogsDeleted,
    remindersDeleted,
    importsDeleted: importResult.deletedCount || 0,
    stagingDeleted,
    loadUsersDeleted: loadUsers.deletedCount || 0,
    tip: "E2E seed users kept. Re-run npm run test:e2e:seed before the next E2E session.",
  };
  console.log(JSON.stringify(report, null, 2));

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

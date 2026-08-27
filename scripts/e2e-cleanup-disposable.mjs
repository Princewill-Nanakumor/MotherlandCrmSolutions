/**
 * Free Atlas space by deleting disposable load/E2E import data.
 * Safe: only removes known test email domains / harness import files.
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

  const leadOr = {
    $or: [
      { email: { $regex: /@e2e\.motherland\.test$/i } },
      { email: { $regex: /@import-load\.motherland\.test$/i } },
    ],
  };

  const leadCountBefore = await leads.countDocuments(leadOr);
  const leadResult = await leads.deleteMany(leadOr);

  const importFilter = {
    $or: [
      { fileName: { $regex: /^soak-/i } },
      { fileName: { $regex: /^concurrent-/i } },
      { fileName: { $regex: /^same-tenant-/i } },
      { fileName: { $regex: /^load-harness-/i } },
      { fileName: { $regex: /pressure/i } },
      { fileName: { $regex: /http-soak/i } },
    ],
  };
  const importDocs = await imports
    .find(importFilter, { projection: { _id: 1 } })
    .toArray();
  const importIds = importDocs.map((d) => d._id);

  let stagingDeleted = 0;
  if (importIds.length) {
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
    importsDeleted: importResult.deletedCount || 0,
    stagingDeleted,
    loadUsersDeleted: loadUsers.deletedCount || 0,
    tip: "Re-run npm run test:e2e:seed after cleanup. If still over quota, wait for Atlas compact or upgrade.",
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

// scripts/backfill-legacy-email-verified.ts
// One-time: mark pre–email-verification users as verified so they can sign in.
//
// Safe rule: only users who are NOT verified yet AND have no outstanding
// verification token (field missing, null, or empty). New signups awaiting
// email confirmation keep a token and are skipped.
//
// Run:
//   npm run backfill-email-verified -- --dry-run
//   npm run backfill-email-verified
//
// Optional: only accounts created before a date (ISO string):
//   BACKFILL_CUTOFF_ISO=2026-01-01 npm run backfill-email-verified -- --dry-run

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import mongoose from "mongoose";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
}

function getDatabaseName(): string | undefined {
  const explicit = process.env.MONGODB_DB_NAME;
  if (explicit) return explicit;
  const uri = process.env.MONGODB_URI;
  if (uri) {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    if (match?.[1]) return match[1];
  }
  return "your_default_db_name";
}

const legacyUnverifiedFilter: Record<string, unknown> = {
  emailVerified: { $ne: true },
  $or: [
    { verificationToken: { $exists: false } },
    { verificationToken: null },
    { verificationToken: "" },
  ],
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const dryRun = process.argv.includes("--dry-run");
  const cutoff = process.env.BACKFILL_CUTOFF_ISO?.trim();
  const filter: Record<string, unknown> = { ...legacyUnverifiedFilter };
  if (cutoff) {
    const d = new Date(cutoff);
    if (Number.isNaN(d.getTime())) {
      console.error("Invalid BACKFILL_CUTOFF_ISO:", cutoff);
      process.exit(1);
    }
    filter.createdAt = { $lt: d };
    console.log("Using createdAt cutoff:", d.toISOString());
  }

  const dbName = getDatabaseName();
  console.log("Connecting…", dbName ? `dbName=${dbName}` : "(default from URI)");

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 30_000,
  });

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("No database handle");
  }

  const users = db.collection("users");

  const matched = await users.countDocuments(filter);
  console.log(
    `Matched ${matched} document(s) (not verified, no pending verification token).`,
  );

  const sample = await users
    .find(filter)
    .project({ email: 1, role: 1, createdAt: 1, emailVerified: 1 })
    .limit(30)
    .toArray();
  if (sample.length) {
    console.log("Sample (up to 30):");
    console.dir(sample, { depth: null });
  }

  if (dryRun) {
    console.log("\nDry run: no writes. Omit --dry-run to apply updates.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (matched === 0) {
    await mongoose.disconnect();
    process.exit(0);
  }

  const res = await users.updateMany(filter, { $set: { emailVerified: true } });
  console.log(
    `\nDone. matchedCount=${res.matchedCount}, modifiedCount=${res.modifiedCount}`,
  );

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

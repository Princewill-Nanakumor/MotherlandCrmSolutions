/**
 * Seeds disposable E2E users into MongoDB.
 * Safe to re-run (upserts by email).
 *
 * Usage: node --env-file=.env scripts/e2e-seed.mjs
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "e2e-admin@motherland.test";
const AGENT_EMAIL = process.env.E2E_AGENT_EMAIL || "e2e-agent@motherland.test";
/** Second agent for reassign benches (assign → agent A → agent B). */
const AGENT_B_EMAIL =
  process.env.E2E_AGENT_B_EMAIL || "e2e-agent-b@motherland.test";
const PASSWORD = process.env.E2E_PASSWORD || "E2eTest1!";

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required to seed E2E users");
  }

  await mongoose.connect(uri, { dbName: getDbName() });
  const users = mongoose.connection.collection("users");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const adminResult = await users.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $set: {
        firstName: "E2E",
        lastName: "Admin",
        email: ADMIN_EMAIL,
        password: hash,
        phoneNumber: "+15550001111",
        country: "United States",
        role: "ADMIN",
        status: "ACTIVE",
        permissions: [],
        emailVerified: true,
        isOnTrial: true,
        trialEndsAt: trialEnds,
        subscriptionStatus: "trial",
        maxLeads: 100000,
        maxUsers: 50,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
      $unset: { adminId: "", createdBy: "" },
    },
    { upsert: true, returnDocument: "after" },
  );

  const admin = adminResult;
  if (!admin?._id) throw new Error("Failed to upsert E2E admin");

  await users.findOneAndUpdate(
    { email: AGENT_EMAIL },
    {
      $set: {
        firstName: "E2E",
        lastName: "Agent",
        email: AGENT_EMAIL,
        password: hash,
        phoneNumber: "+15550002222",
        country: "United States",
        role: "AGENT",
        status: "ACTIVE",
        permissions: ["ASSIGN_LEADS"],
        adminId: admin._id,
        createdBy: admin._id,
        emailVerified: true,
        canViewPhoneNumbers: true,
        canViewEmails: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  await users.findOneAndUpdate(
    { email: AGENT_B_EMAIL },
    {
      $set: {
        firstName: "E2E",
        lastName: "AgentB",
        email: AGENT_B_EMAIL,
        password: hash,
        phoneNumber: "+15550003333",
        country: "United States",
        role: "AGENT",
        status: "ACTIVE",
        permissions: [],
        adminId: admin._id,
        createdBy: admin._id,
        emailVerified: true,
        canViewPhoneNumbers: true,
        canViewEmails: true,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, returnDocument: "after" },
  );

  // Clean leftover e2e leads from prior runs for this tenant (keep volume low)
  await mongoose.connection.collection("leads").deleteMany({
    adminId: admin._id,
    email: { $regex: /@e2e\.motherland\.test$/i },
  });

  console.log(
    JSON.stringify({
      ok: true,
      adminEmail: ADMIN_EMAIL,
      agentEmail: AGENT_EMAIL,
      agentBEmail: AGENT_B_EMAIL,
      adminId: String(admin._id),
      passwordFromEnv: Boolean(process.env.E2E_PASSWORD),
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

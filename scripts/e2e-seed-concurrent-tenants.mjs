/**
 * Seeds disposable multi-tenant E2E admins for concurrent HTTP import soaks.
 * Labels A–E → e2e-admin-a@motherland.test … e2e-admin-e@motherland.test
 *
 *   node --env-file=.env scripts/e2e-seed-concurrent-tenants.mjs
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const PASSWORD = process.env.E2E_PASSWORD || "E2eTest1!";
const LABELS = (process.env.E2E_CONCURRENT_LABELS || "A,B,C,D,E")
  .split(",")
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

function getDbName() {
  if (process.env.MONGODB_DB_NAME) return process.env.MONGODB_DB_NAME;
  const uri = process.env.MONGODB_URI || "";
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] || "your_default_db_name";
}

function adminEmail(label) {
  return `e2e-admin-${label.toLowerCase()}@motherland.test`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri, { dbName: getDbName() });
  const users = mongoose.connection.collection("users");
  const leads = mongoose.connection.collection("leads");
  const hash = await bcrypt.hash(PASSWORD, 10);
  const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const seeded = [];
  for (const label of LABELS) {
    const email = adminEmail(label);
    const doc = await users.findOneAndUpdate(
      { email },
      {
        $set: {
          firstName: "E2E",
          lastName: `Tenant${label}`,
          email,
          password: hash,
          phoneNumber: `+1555000${label.charCodeAt(0)}`,
          country: "United States",
          role: "ADMIN",
          status: "ACTIVE",
          permissions: [],
          emailVerified: true,
          isOnTrial: true,
          trialEndsAt: trialEnds,
          subscriptionStatus: "trial",
          // Enough headroom for concurrent 50k imports
          maxLeads: -1,
          maxUsers: 50,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
        $unset: { adminId: "", createdBy: "" },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!doc?._id) throw new Error(`Failed to seed ${email}`);
    await leads.deleteMany({
      adminId: doc._id,
      email: { $regex: /@e2e\.motherland\.test$/i },
    });
    seeded.push({ label, email, adminId: String(doc._id) });
  }

  console.log(JSON.stringify({ ok: true, password: PASSWORD, tenants: seeded }));
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

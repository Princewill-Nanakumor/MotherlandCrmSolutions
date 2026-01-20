// scripts/add-lead-indexes.ts
// Run with: npx tsx scripts/add-lead-indexes.ts

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// Load .env if present
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log("Loaded .env");
} else {
  console.warn(".env not found, using environment variables");
}

if (!process.env.MONGODB_URI) {
  console.error(
    "MONGODB_URI not set. Please set it in your environment or .env file."
  );
  process.exit(1);
}

async function run() {
  try {
    const { connectMongoDB, disconnectMongoDB, mongoose } =
      await import("../src/libs/dbConfig");

    console.log("Connecting to MongoDB...");
    await connectMongoDB();

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    const collection = db.collection("leads");

    console.log("Creating index: { adminId: 1 } (background)");
    await collection.createIndex({ adminId: 1 }, { background: true });

    console.log("Creating index: { assignedTo: 1 } (background)");
    await collection.createIndex({ assignedTo: 1 }, { background: true });

    console.log(
      "Creating compound index: { adminId: 1, assignedTo: 1 } (background)"
    );
    await collection.createIndex(
      { adminId: 1, assignedTo: 1 },
      { background: true }
    );

    console.log("Creating index: { createdAt: -1 } (background)");
    await collection.createIndex({ createdAt: -1 }, { background: true });

    console.log("Indexes created successfully. Listing indexes:");
    const indexes = await collection.indexes();
    console.log(indexes);

    await disconnectMongoDB();
    process.exit(0);
  } catch (err) {
    console.error("Failed to create indexes:", err);
    process.exit(1);
  }
}

run();

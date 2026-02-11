// scripts/add-lead-indexes.ts
// Run with: npm run add-lead-indexes

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import mongoose from "mongoose";

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

// Match dbConfig: same URI and db name so we connect to the same database
const MONGODB_URI =
  process.env.MONGODB_URI!.replace(/\/$/, "") + "/your_default_db_name";

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      dbName: "your_default_db_name",
      serverSelectionTimeoutMS: 30000,
    });

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

    // Compound indexes for /api/leads/all list (filter + sort)
    console.log(
      "Creating compound index: { adminId: 1, createdAt: -1 } (background)"
    );
    await collection.createIndex(
      { adminId: 1, createdAt: -1 },
      { background: true }
    );

    console.log(
      "Creating compound index: { adminId: 1, status: 1, createdAt: -1 } (background)"
    );
    await collection.createIndex(
      { adminId: 1, status: 1, createdAt: -1 },
      { background: true }
    );

    console.log(
      "Creating compound index: { adminId: 1, country: 1, createdAt: -1 } (background)"
    );
    await collection.createIndex(
      { adminId: 1, country: 1, createdAt: -1 },
      { background: true }
    );

    console.log(
      "Creating compound index: { adminId: 1, source: 1, createdAt: -1 } (background)"
    );
    await collection.createIndex(
      { adminId: 1, source: 1, createdAt: -1 },
      { background: true }
    );

    // Comments collection indexes for list API aggregations
    const commentsCollection = db.collection("comments");
    console.log(
      "Creating index on comments: { leadId: 1, adminId: 1, createdAt: -1 } (background)"
    );
    await commentsCollection.createIndex(
      { leadId: 1, adminId: 1, createdAt: -1 },
      { background: true }
    );

    console.log("Indexes created successfully. Listing indexes:");
    const indexes = await collection.indexes();
    console.log(indexes);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Failed to create indexes:", err);
    process.exit(1);
  }
}

run();

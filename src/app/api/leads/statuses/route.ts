import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

/**
 * Returns distinct status values that have at least one lead.
 * Used by the status filter to only show statuses that exist in the data.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    const match: Record<string, unknown> = {};
    const userId = new ObjectId(session.user.id);
    if (session.user.role === "ADMIN") {
      match.adminId = userId;
    } else if (session.user.role === "AGENT") {
      match.$or = [{ assignedTo: userId }, { "assignedTo._id": userId }];
    }

    const result = await db
      .collection("leads")
      .aggregate<{ _id: string | null }>([
        { $match: match },
        { $group: { _id: "$status" } },
        { $match: { _id: { $exists: true, $nin: [null, ""] } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const statuses = result
      .map((r) => (r._id != null ? String(r._id) : ""))
      .filter((s) => s.trim() !== "");
    const unique = [...new Set(statuses)].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
    return NextResponse.json(unique);
  } catch (error) {
    console.error("Error fetching lead statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch statuses" },
      { status: 500 }
    );
  }
}

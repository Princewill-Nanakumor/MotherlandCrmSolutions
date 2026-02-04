import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

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
        { $group: { _id: "$source" } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const raw = result
      .map((r) => r._id)
      .filter(
        (s): s is string =>
          typeof s === "string" &&
          s.trim() !== "" &&
          s.trim() !== "-" &&
          s.trim() !== "—"
      )
      .map((s) => s.trim());
    const sources = [...new Set(raw)].sort((a, b) => a.localeCompare(b));
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error fetching lead sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    );
  }
}

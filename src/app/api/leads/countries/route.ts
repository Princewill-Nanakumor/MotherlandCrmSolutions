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
      .aggregate<{ _id: string }>([
        { $match: match },
        { $group: { _id: "$country" } },
        { $match: { _id: { $exists: true, $nin: [null, ""] } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const countries = result
      .map((r) => r._id)
      .filter((c): c is string => typeof c === "string" && c.trim() !== "");
    countries.sort((a, b) => a.localeCompare(b));
    return NextResponse.json(countries);
  } catch (error) {
    console.error("Error fetching lead countries:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}

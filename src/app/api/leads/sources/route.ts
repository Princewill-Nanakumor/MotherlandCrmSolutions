import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { buildTenantLeadBaseQuery } from "@/lib/leadListQuery";

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

    const match = buildTenantLeadBaseQuery({
      id: session.user.id,
      role: session.user.role,
      adminId: session.user.adminId,
      permissions: session.user.permissions,
    });

    const result = await db
      .collection("leads")
      .aggregate<{ _id: string | null }>([
        { $match: match },
        { $group: { _id: "$source" } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const trimmed = result
      .map((r) => (r._id != null ? String(r._id).trim() : ""))
      .filter((s) => s !== "" && s !== "-" && s !== "—");
    // Deduplicate by normalized key (case-insensitive) so "Richer" and "richer" become one
    const byKey = new Map<string, string>();
    for (const s of trimmed) {
      const key = s.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, s);
    }
    const sources = Array.from(byKey.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error fetching lead sources:", error);
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}

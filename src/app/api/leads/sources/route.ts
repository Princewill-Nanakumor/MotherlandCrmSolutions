import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { buildTenantLeadBaseQuery } from "@/lib/leadListQuery";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";

export async function GET() {
  const perf = new ApiRoutePerf("GET /api/leads/sources");
  try {
    const session = await getServerSession(authOptions);
    perf.mark("getServerSession");
    if (!session) {
      perf.finish({ status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    perf.mark("connectMongoDB");
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
    perf.mark("aggregate");

    const trimmed = result
      .map((r) => (r._id != null ? String(r._id).trim() : ""))
      .filter((s) => s !== "" && s !== "-" && s !== "—");
    const byKey = new Map<string, string>();
    for (const s of trimmed) {
      const key = s.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, s);
    }
    const sources = Array.from(byKey.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    perf.mark("serialize");
    perf.finish({ count: sources.length });
    return NextResponse.json(sources);
  } catch (error) {
    console.error("Error fetching lead sources:", error);
    perf.finish({ error: true });
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 },
    );
  }
}

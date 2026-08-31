import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { normalizeCountryInput } from "@/lib/countryNormalize";
import { buildTenantLeadBaseQuery } from "@/lib/leadListQuery";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";

export async function GET() {
  const perf = new ApiRoutePerf("GET /api/leads/countries");
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
      .aggregate<{ _id: string }>([
        { $match: match },
        { $group: { _id: "$country" } },
        { $match: { _id: { $exists: true, $nin: [null, ""] } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    perf.mark("aggregate");

    const countries = result
      .map((r) => (r._id != null ? String(r._id).trim() : ""))
      .filter((c) => c !== "");
    const byKey = new Map<string, string>();
    for (const c of countries) {
      const canonical = normalizeCountryInput(c);
      const key = canonical.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, canonical);
    }
    const payload = Array.from(byKey.values()).sort((a, b) =>
      a.localeCompare(b),
    );
    perf.mark("serialize");
    perf.finish({ count: payload.length });
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching lead countries:", error);
    perf.finish({ error: true });
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 },
    );
  }
}

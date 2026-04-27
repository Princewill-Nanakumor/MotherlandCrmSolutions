// src/app/api/calls/cleanup/route.ts
// This endpoint deletes call logs older than 3 days
// Should be called by a cron job or scheduled task
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/libs/dbConfig";
import CallLog from "@/models/CallLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanupUnauthorized(req: Request): Response | null {
  const expectedToken = process.env.CLEANUP_API_TOKEN;
  const authHeader = req.headers.get("authorization");
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const denied = cleanupUnauthorized(req);
    if (denied) return denied;

    await connectMongoDB();

    // Calculate date 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Delete all call logs older than 3 days
    const result = await CallLog.deleteMany({
      createdAt: { $lt: threeDaysAgo },
    });

    return NextResponse.json(
      {
        success: true,
        deletedCount: result.deletedCount,
        cutoffDate: threeDaysAgo.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cleaning up call logs:", error);
    return NextResponse.json(
      { error: "Failed to cleanup call logs" },
      { status: 500 }
    );
  }
}

// Also allow GET for testing (requires same bearer token as POST)
export async function GET(req: Request) {
  try {
    const denied = cleanupUnauthorized(req);
    if (denied) return denied;

    await connectMongoDB();

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const count = await CallLog.countDocuments({
      createdAt: { $lt: threeDaysAgo },
    });

    return NextResponse.json(
      {
        logsToDelete: count,
        cutoffDate: threeDaysAgo.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error counting old logs:", error);
    return NextResponse.json(
      { error: "Failed to count old logs" },
      { status: 500 }
    );
  }
}

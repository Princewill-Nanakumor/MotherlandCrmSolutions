import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/dbConfig";
import { reconcileStalePendingApprovalNotifications } from "@/lib/resolvePendingApprovalNotifications";

/**
 * Low-frequency safety net: rewrite PAYMENT_PENDING_APPROVAL notifications
 * whose payments are already COMPLETED/FAILED.
 *
 * Auth: CRON_SECRET via Authorization: Bearer … or x-cron-secret
 * (same pattern as /api/reminders/run).
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret;
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const updated = await reconcileStalePendingApprovalNotifications();

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error) {
    console.error("Error reconciling pending approval notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
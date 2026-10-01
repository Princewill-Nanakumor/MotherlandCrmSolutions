// src/app/api/notifications/all/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/dbConfig";
import mongoose from "mongoose";
import type { Session } from "next-auth";
import {
  isSuperAdminSession,
  notificationOwnerSelectors,
} from "@/lib/notificationQuery";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";

export async function GET() {
  const perf = new ApiRoutePerf("GET /api/notifications/all");
  try {
    const session = await getServerSession(authOptions);
    perf.mark("getServerSession");
    if (!session?.user) {
      perf.finish({ status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    perf.mark("connectMongoDB");
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    const isSuperAdmin = isSuperAdminSession(session as Session);

    let query: Record<string, unknown> = {};

    if (isSuperAdmin) {
      query = {
        $or: [{ role: "SUPER_ADMIN" }, { role: "ADMIN", userId: userId }],
        // NO read filter - show all notifications
      };
    } else if (userRole === "ADMIN") {
      query = {
        role: "ADMIN",
        userId: userId,
        // NO read filter - show all notifications
      };
    } else {
      query = {
        role: { $in: ["AGENT", "USER"] },
        $or: notificationOwnerSelectors(session as Session),
      };
    }

    const notifications = await mongoose.connection.db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100) // Increased limit for all notifications
      .toArray();
    perf.mark("notificationsFind");

    return apiPerfJsonResponse(perf, notifications, {
      extra: { count: notifications.length },
    });
  } catch (error) {
    console.error("Error fetching all notifications:", error);
    perf.finish({ error: true });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

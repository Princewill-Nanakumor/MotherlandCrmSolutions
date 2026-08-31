// app/api/statuses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Status from "@/models/Status";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { canCreateStatus } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";

// Define query type for MongoDB filters
interface StatusQuery {
  adminId?: mongoose.Types.ObjectId;
}

// Helper to retry DB operation if connection fails
async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      await connectMongoDB();
      return await operation();
    } catch (err) {
      lastError = err;
      if (i === retries) throw err;
      // Wait a bit before retrying
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  throw lastError;
}

// GET /api/statuses
export async function GET() {
  const perf = new ApiRoutePerf("GET /api/statuses");
  try {
    const session = await getServerSession(authOptions);
    perf.mark("getServerSession");
    if (!session) {
      perf.finish({ status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Filter statuses by adminId for multi-tenancy
    const query: StatusQuery = {};

    if (session.user.role === "ADMIN") {
      // Admin sees only statuses they created
      query.adminId = new mongoose.Types.ObjectId(session.user.id);
    } else if (
      (session.user.role === "AGENT" || session.user.role === "SUBADMIN") &&
      session.user.adminId
    ) {
      // Staff sees statuses from their admin
      query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
    }

    const statuses = await withDbRetry(() =>
      Status.find(query).sort({ createdAt: 1 })
    );
    perf.mark("Status.find");

    // FIXED: Return the correct structure that works for both filtering and display
    const transformedStatuses = statuses.map((status) => ({
      _id: status._id.toString(), // Keep _id for display compatibility
      id: status._id.toString(), // Add id for filtering compatibility
      name: status.name,
      color: status.color,
      adminId: status.adminId.toString(),
      createdBy: status.createdBy.toString(),
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    }));

    // Ensure "NEW" status is always included (for imported leads that default to "NEW")
    const hasNewStatus = transformedStatuses.some(
      (s) => s._id === "NEW" || s.id === "NEW" || s.name?.toUpperCase() === "NEW"
    );
    if (!hasNewStatus) {
      transformedStatuses.unshift({
        _id: "NEW",
        id: "NEW",
        name: "New",
        color: "#3B82F6",
        adminId: session.user.id,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Never let the browser serve a stale status list after create/delete —
    // StatusModal and filters refetch this endpoint often.
    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("Vary", "Cookie");

    perf.mark("serialize");
    perf.finish({ count: transformedStatuses.length });
    return NextResponse.json(transformedStatuses, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    perf.finish({ error: true });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/statuses
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canCreateStatus(session.user)) {
      return NextResponse.json(
        { error: "Only administrators can create statuses" },
        { status: 403 }
      );
    }

    const { name, color } = await req.json();
    if (!name || !color) {
      return NextResponse.json(
        { message: "Name and color are required" },
        { status: 400 }
      );
    }

    const newStatus = await withDbRetry(() =>
      Status.create({
        name,
        color,
        adminId: new mongoose.Types.ObjectId(session.user.id),
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      })
    );

    // Return the same structure as GET
    const transformedStatus = {
      _id: newStatus._id.toString(),
      id: newStatus._id.toString(),
      name: newStatus.name,
      color: newStatus.color,
      adminId: newStatus.adminId.toString(),
      createdBy: newStatus.createdBy.toString(),
      createdAt: newStatus.createdAt,
      updatedAt: newStatus.updatedAt,
    };

    return NextResponse.json(transformedStatus, { status: 201 });
  } catch (error) {
    console.error("Error creating status:", error);
    return NextResponse.json(
      { message: "Failed to create status" },
      { status: 500 }
    );
  }
}

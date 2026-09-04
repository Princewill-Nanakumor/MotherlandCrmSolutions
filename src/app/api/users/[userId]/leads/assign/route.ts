// /src/app/api/users/[userId]/leads/assign/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import {
  assertAssignmentCapacity,
  countAssignmentsTowardCapacity,
  countLeadsAssignedToAgent,
} from "@/lib/leadAssignmentQuery";

function extractLeadIdFromUrl(urlString: string): string {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  // Assumes route: /api/leads/[leadId]/assign
  // e.g. /api/leads/123/assign -> parts = ["", "api", "leads", "123", "assign"]
  return parts[parts.length - 2];
}

export async function POST(request: Request) {
  try {
    const leadId = extractLeadIdFromUrl(request.url);

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return unauthorizedResponse();
    }

    const { userId } = await request.json();

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Build query with multi-tenancy filter
    const query: {
      _id: mongoose.Types.ObjectId;
      adminId?: mongoose.Types.ObjectId;
    } = {
      _id: new mongoose.Types.ObjectId(leadId),
    };

    // Admin can only assign leads they created
    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    query.adminId = new mongoose.Types.ObjectId(adminScopeId);

    const existingLead = await db.collection("leads").findOne(query, {
      projection: { assignedTo: 1 },
    });

    if (!existingLead) {
      return NextResponse.json(
        { message: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    const netNewAssignments = countAssignmentsTowardCapacity(
      [existingLead],
      userId,
    );

    if (netNewAssignments > 0) {
      const targetUser = await db.collection("users").findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { firstName: 1, lastName: 1 } },
      );

      const currentCount = await countLeadsAssignedToAgent(
        db.collection("leads"),
        query.adminId,
        userId,
      );
      try {
        assertAssignmentCapacity(
          String(targetUser?.firstName ?? "Agent"),
          String(targetUser?.lastName ?? ""),
          currentCount,
          netNewAssignments,
        );
      } catch (capacityError) {
        return NextResponse.json(
          {
            message:
              capacityError instanceof Error
                ? capacityError.message
                : "Assignment limit exceeded",
          },
          { status: 400 },
        );
      }
    }

    const lead = await db.collection("leads").findOneAndUpdate(
      query,
      {
        $set: {
          assignedTo: new mongoose.Types.ObjectId(userId),
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!lead) {
      return NextResponse.json(
        { message: "Lead not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Lead assigned successfully",
      lead,
    });
  } catch (error) {
    console.error("Error assigning lead:", error);
    return NextResponse.json(
      { message: "Error assigning lead" },
      { status: 500 }
    );
  }
}

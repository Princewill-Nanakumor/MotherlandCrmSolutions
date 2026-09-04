// /src/app/api/users/[userId]/leads/route.ts
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

function extractUserIdFromUrl(urlString: string): string {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  // Assumes route: /api/users/[userId]/leads
  // e.g. /api/users/123/leads -> parts = ["", "api", "users", "123", "leads"]
  return parts[parts.length - 2];
}

export async function POST(request: Request) {
  try {
    const userId = extractUserIdFromUrl(request.url);

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return unauthorizedResponse();
    }

    const { leadIds } = await request.json();

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);

    // Get user with multi-tenancy filter
    const user = await db.collection("users").findOne({
      _id: new mongoose.Types.ObjectId(userId),
      createdBy: adminObjectId, // Only users created by this admin
      status: "ACTIVE",
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found or inactive" },
        { status: 404 }
      );
    }

    const leadObjectIds = leadIds.map(
      (id: string) => new mongoose.Types.ObjectId(id),
    );
    const targetLeads = await db
      .collection("leads")
      .find({
        _id: { $in: leadObjectIds },
        adminId: adminObjectId,
      })
      .project({ assignedTo: 1 })
      .toArray();

    const netNewAssignments = countAssignmentsTowardCapacity(
      targetLeads,
      userId,
    );

    if (netNewAssignments > 0) {
      const currentCount = await countLeadsAssignedToAgent(
        db.collection("leads"),
        adminObjectId,
        userId,
      );
      try {
        assertAssignmentCapacity(
          String(user.firstName ?? "Agent"),
          String(user.lastName ?? ""),
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

    // Update leads with multi-tenancy filter
    await db.collection("leads").updateMany(
      {
        _id: {
          $in: leadIds.map((id: string) => new mongoose.Types.ObjectId(id)),
        },
        adminId: adminObjectId, // Only leads belonging to this admin
      },
      {
        $set: {
          assignedTo: user._id,
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
      }
    );

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $addToSet: { assignedLeads: { $each: leadIds } },
      }
    );

    return NextResponse.json({
      message: "Leads assigned successfully",
    });
  } catch (error: unknown) {
    console.error("Error assigning leads:", error);
    return NextResponse.json(
      { message: "Error assigning leads" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const userId = extractUserIdFromUrl(request.url);

    const session = await getServerSession(authOptions);

    if (!session) {
      return unauthorizedResponse();
    }

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;

    // Build query with multi-tenancy filter
    const query: {
      assignedTo: mongoose.Types.ObjectId;
      adminId?: mongoose.Types.ObjectId;
    } = {
      assignedTo: new mongoose.Types.ObjectId(userId),
    };

    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    query.adminId = new mongoose.Types.ObjectId(adminScopeId);

    const leads = await db
      .collection("leads")
      .find(query)
      .project({
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        status: 1,
        assignedAt: 1,
      })
      .sort({ assignedAt: -1 })
      .toArray();

    return NextResponse.json(leads);
  } catch (error: unknown) {
    console.error("Error fetching assigned leads:", error);
    return NextResponse.json(
      { message: "Error fetching assigned leads" },
      { status: 500 }
    );
  }
}

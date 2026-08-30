// app/api/leads/unassign/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import {
  formatAssigneeName,
  getEmbeddedAssignee,
  insertActivitiesInChunks,
  MAX_BULK_LEAD_OPS,
} from "@/lib/bulkLeadOps";
import { canAssignLeads, getTenantAdminId } from "@/lib/roles";
import { rateLimitEnhanced } from "@/lib/rateLimit";

interface UnassignLeadsRequest {
  leadIds: string[];
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
  assignedTo?: unknown;
  adminId: mongoose.Types.ObjectId;
}

interface UserDocument {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
}

export async function POST(request: Request) {
  try {
    if (!rateLimitEnhanced(request, 30, 60_000, "leads-unassign")) {
      return NextResponse.json(
        { message: "Too many unassignment requests. Please try again shortly." },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !canAssignLeads(session.user)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { leadIds }: UnassignLeadsRequest = await request.json();

    if (!leadIds?.length) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 },
      );
    }

    if (leadIds.length > MAX_BULK_LEAD_OPS) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot unassign more than ${MAX_BULK_LEAD_OPS} leads at once`,
          code: "BULK_UNASSIGN_LIMIT",
        },
        { status: 400 },
      );
    }

    await connectMongoDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const leadObjectIds = leadIds.map((id) => new mongoose.Types.ObjectId(id));
    const tenantId = getTenantAdminId(session.user);
    if (!tenantId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const adminObjectId = new mongoose.Types.ObjectId(tenantId);

    const beforeLeads = (await db
      .collection("leads")
      .find({
        _id: { $in: leadObjectIds },
        assignedTo: { $exists: true, $ne: null },
        adminId: adminObjectId,
      })
      .toArray()) as LeadDocument[];

    if (beforeLeads.length === 0) {
      return NextResponse.json(
        { message: "No valid leads found to unassign" },
        { status: 400 },
      );
    }

    const assignedByUserResult = (await db
      .collection("users")
      .findOne(
        { _id: new mongoose.Types.ObjectId(session.user.id) },
        { projection: { firstName: 1, lastName: 1 } },
      )) as UserDocument | null;

    if (!assignedByUserResult) {
      throw new Error("User not found");
    }

    const now = new Date();
    const leadIdsToUnassign = beforeLeads.map((lead) => lead._id);

    await db.collection("leads").updateMany(
      {
        _id: { $in: leadIdsToUnassign },
        adminId: adminObjectId,
      },
      {
        $set: {
          assignedTo: null,
          updatedAt: now,
          lastActivityAt: now,
        },
      },
    );

    const performedBy = {
      id: assignedByUserResult._id.toString(),
      firstName: assignedByUserResult.firstName,
      lastName: assignedByUserResult.lastName,
    };

    const activities = beforeLeads.map((lead) => {
      const unassignedUser = getEmbeddedAssignee(lead.assignedTo);
      const fromName = formatAssigneeName(unassignedUser);

      return {
        type: "ASSIGNMENT",
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: `Lead unassigned from ${fromName}`,
        leadId: lead._id,
        adminId: adminObjectId,
        timestamp: now,
        metadata: {
          assignedTo: null,
          assignedFrom: unassignedUser
            ? {
                _id: unassignedUser._id,
                firstName: unassignedUser.firstName,
                lastName: unassignedUser.lastName,
              }
            : null,
          assignedBy: {
            id: performedBy.id,
            _id: assignedByUserResult._id,
            firstName: performedBy.firstName,
            lastName: performedBy.lastName,
          },
          performedBy,
        },
      };
    });

    await insertActivitiesInChunks(db, activities);

    await publishAdminLeadsUpdatedEvent(adminObjectId.toString(), {
      type: "lead_unassigned_bulk",
      leadIds: leadIdsToUnassign.map((id) => id.toString()),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unassigned ${beforeLeads.length} leads`,
      unassignedCount: beforeLeads.length,
    });
  } catch (error) {
    console.error("Error in unassign endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error unassigning leads",
      },
      { status: 500 },
    );
  }
}

// app/api/leads/assign/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import {
  assertAssignmentCapacity,
  countAssignmentsTowardCapacity,
  countLeadsAssignedToAgent,
  getLeadAssigneeId,
} from "@/lib/leadAssignmentQuery";
import {
  formatAssigneeName,
  getEmbeddedAssignee,
  insertActivitiesInChunks,
  MAX_BULK_LEAD_OPS,
} from "@/lib/bulkLeadOps";
import { canAssignLeads, getTenantAdminId, isAssignableTeamRole } from "@/lib/roles";
import { rateLimitEnhanced } from "@/lib/rateLimit";

interface AssignLeadsRequest {
  leadIds: string[];
  userId: string;
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
  assignedTo?: {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
  };
  adminId: mongoose.Types.ObjectId;
}

interface UserDocument {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  role: string;
}

export async function POST(request: Request) {
  try {
    if (!rateLimitEnhanced(request, 30, 60_000, "leads-assign")) {
      return NextResponse.json(
        { message: "Too many assignment requests. Please try again shortly." },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !canAssignLeads(session.user)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, userId }: AssignLeadsRequest = await request.json();

    if (!leadIds?.length || !userId) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 },
      );
    }

    if (leadIds.length > MAX_BULK_LEAD_OPS) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot assign more than ${MAX_BULK_LEAD_OPS} leads at once`,
          code: "BULK_ASSIGN_LIMIT",
        },
        { status: 400 },
      );
    }

    await connectMongoDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const userObjectId = new mongoose.Types.ObjectId(userId);
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
        adminId: adminObjectId,
      })
      .toArray()) as LeadDocument[];

    if (beforeLeads.length === 0) {
      return NextResponse.json(
        { message: "No valid leads found to assign" },
        { status: 400 },
      );
    }

    const [assignedToUserResult, assignedByUserResult] = await Promise.all([
      db.collection("users").findOne(
        {
          _id: userObjectId,
          adminId: adminObjectId,
        },
        { projection: { firstName: 1, lastName: 1, role: 1 } },
      ),
      db.collection("users").findOne(
        { _id: new mongoose.Types.ObjectId(session.user.id) },
        { projection: { firstName: 1, lastName: 1 } },
      ),
    ]);

    const assignedToUser = assignedToUserResult as UserDocument | null;
    const assignedByUser = assignedByUserResult as UserDocument | null;

    if (!assignedToUser) {
      throw new Error("Target user not found or not authorized");
    }

    if (!assignedByUser) {
      throw new Error("Assigned by user not found");
    }

    if (!isAssignableTeamRole(assignedToUser.role)) {
      throw new Error("Can only assign leads to team members");
    }

    const changedLeads = beforeLeads.filter(
      (lead) => getLeadAssigneeId(lead.assignedTo) !== userId,
    );

    if (changedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Successfully assigned 0 leads",
        modifiedCount: 0,
        assignedTo: {
          id: assignedToUser._id.toString(),
          firstName: assignedToUser.firstName,
          lastName: assignedToUser.lastName,
        },
      });
    }

    const netNewAssignments = countAssignmentsTowardCapacity(
      changedLeads,
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
          assignedToUser.firstName,
          assignedToUser.lastName,
          currentCount,
          netNewAssignments,
        );
      } catch (capacityError) {
        return NextResponse.json(
          {
            success: false,
            message:
              capacityError instanceof Error
                ? capacityError.message
                : "Assignment limit exceeded",
          },
          { status: 400 },
        );
      }
    }

    const assignedToData = {
      _id: assignedToUser._id,
      firstName: assignedToUser.firstName,
      lastName: assignedToUser.lastName,
    };
    const now = new Date();
    const changedIds = changedLeads.map((lead) => lead._id);

    await db.collection("leads").updateMany(
      {
        _id: { $in: changedIds },
        adminId: adminObjectId,
      },
      {
        $set: {
          assignedTo: assignedToData,
          assignedAt: now,
          updatedAt: now,
          lastActivityAt: now,
        },
      },
    );

    const performedBy = {
      id: assignedByUser._id.toString(),
      firstName: assignedByUser.firstName,
      lastName: assignedByUser.lastName,
    };

    const activities = changedLeads.map((lead) => {
      const oldAssignedTo = getEmbeddedAssignee(lead.assignedTo);
      const isReassignment = !!oldAssignedTo;
      const fromName = formatAssigneeName(oldAssignedTo, "Previous User");
      const toName = formatAssigneeName(assignedToData);

      return {
        type: "ASSIGNMENT",
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: isReassignment
          ? `Lead reassigned from ${fromName} to ${toName}`
          : `Lead assigned to ${toName}`,
        leadId: lead._id,
        adminId: adminObjectId,
        timestamp: now,
        metadata: {
          assignedTo: assignedToData,
          assignedFrom: oldAssignedTo
            ? {
                _id: oldAssignedTo._id,
                firstName: oldAssignedTo.firstName,
                lastName: oldAssignedTo.lastName,
              }
            : null,
          assignedBy: {
            id: performedBy.id,
            _id: assignedByUser._id,
            firstName: performedBy.firstName,
            lastName: performedBy.lastName,
          },
          performedBy,
        },
      };
    });

    await insertActivitiesInChunks(db, activities);

    await publishAdminLeadsUpdatedEvent(adminObjectId.toString(), {
      type: "lead_assigned_bulk",
      leadIds: changedIds.map((id) => id.toString()),
      assignedTo: userId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${changedLeads.length} leads`,
      modifiedCount: changedLeads.length,
      assignedTo: {
        id: assignedToUser._id.toString(),
        firstName: assignedToUser.firstName,
        lastName: assignedToUser.lastName,
      },
    });
  } catch (error) {
    console.error("Error in assign endpoint:", error);
    const message =
      error instanceof Error ? error.message : "Error assigning leads";
    const isClientError =
      message.includes("not found") ||
      message.includes("Can only assign") ||
      message.includes("Invalid");
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: isClientError ? 400 : 500 },
    );
  }
}

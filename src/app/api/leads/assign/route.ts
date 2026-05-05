// app/api/leads/assign/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";

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
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserDocument {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  role: string;
  adminId?: mongoose.Types.ObjectId;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, userId }: AssignLeadsRequest = await request.json();

    if (!leadIds?.length || !userId) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const leadObjectIds = leadIds.map((id) => new mongoose.Types.ObjectId(id));
    const adminObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Get leads before update with multi-tenancy filter
    const beforeLeads = (await db
      .collection("leads")
      .find({
        _id: { $in: leadObjectIds },
        adminId: adminObjectId, // Only leads belonging to this admin
      })
      .toArray()) as LeadDocument[];

    if (beforeLeads.length === 0) {
      return NextResponse.json(
        { message: "No valid leads found to assign" },
        { status: 400 }
      );
    }

    // Get user details with multi-tenancy check
    const [assignedToUserResult, assignedByUserResult] = await Promise.all([
      db.collection("users").findOne(
        {
          _id: userObjectId,
          adminId: adminObjectId, // Only users created by this admin
        },
        { projection: { firstName: 1, lastName: 1, role: 1 } }
      ),
      db
        .collection("users")
        .findOne(
          { _id: new mongoose.Types.ObjectId(session.user.id) },
          { projection: { firstName: 1, lastName: 1 } }
        ),
    ]);

    // Type assertion after the Promise resolves
    const assignedToUser = assignedToUserResult as UserDocument | null;
    const assignedByUser = assignedByUserResult as UserDocument | null;

    if (!assignedToUser) {
      throw new Error("Target user not found or not authorized");
    }

    if (!assignedByUser) {
      throw new Error("Assigned by user not found");
    }

    // Verify the target user is an AGENT
    if (assignedToUser.role !== "AGENT") {
      throw new Error("Can only assign leads to AGENT users");
    }

    // Update leads and create activities
    const updatePromises = beforeLeads.map(async (lead) => {
      const oldAssignedTo = lead.assignedTo;
      const isReassignment = !!oldAssignedTo;

      // Check if assignment is actually changing
      if (oldAssignedTo && oldAssignedTo._id.toString() === userId) {
        return lead; // No change needed
      }

      // Store assignedTo as an object with user details for consistency
      const assignedToData = {
        _id: assignedToUser._id,
        firstName: assignedToUser.firstName,
        lastName: assignedToUser.lastName,
      };

      // Update lead
      const updatedLeadResult = await db.collection("leads").findOneAndUpdate(
        { _id: lead._id },
        {
          $set: {
            assignedTo: assignedToData,
            assignedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      // Create activity only if assignment actually changed
      const activityData = {
        type: "ASSIGNMENT",
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: isReassignment
          ? `Lead reassigned from ${oldAssignedTo ? `${oldAssignedTo.firstName} ${oldAssignedTo.lastName}` : "Previous User"} to ${assignedToUser.firstName} ${assignedToUser.lastName}`
          : `Lead assigned to ${assignedToUser.firstName} ${assignedToUser.lastName}`,
        leadId: lead._id,
        adminId: adminObjectId, // Multi-tenancy
        timestamp: new Date(),
        metadata: {
          assignedTo: {
            _id: assignedToUser._id,
            firstName: assignedToUser.firstName,
            lastName: assignedToUser.lastName,
          },
          assignedFrom: oldAssignedTo
            ? {
                _id: oldAssignedTo._id,
                firstName: oldAssignedTo.firstName,
                lastName: oldAssignedTo.lastName,
              }
            : null,
          assignedBy: {
            _id: assignedByUser._id,
            firstName: assignedByUser.firstName,
            lastName: assignedByUser.lastName,
          },
        },
      };

      await db.collection("activities").insertOne(activityData);

      return updatedLeadResult;
    });

    const results = await Promise.all(updatePromises);
    const actualUpdates = results.filter((lead) => lead !== null);

    await Promise.allSettled(
      beforeLeads.map((lead) =>
        publishLeadUpdatedEvent(adminObjectId.toString(), lead._id.toString(), {
          type: "lead_assigned_bulk",
          leadId: lead._id.toString(),
          assignedTo: userId,
        })
      )
    );
    await publishAdminLeadsUpdatedEvent(adminObjectId.toString(), {
      type: "lead_assigned_bulk",
      leadIds: beforeLeads.map((lead) => lead._id.toString()),
      assignedTo: userId,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${actualUpdates.length} leads`,
      modifiedCount: actualUpdates.length,
      assignedTo: {
        id: assignedToUser._id.toString(),
        firstName: assignedToUser.firstName,
        lastName: assignedToUser.lastName,
      },
    });
  } catch (error) {
    console.error("Error in assign endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error assigning leads",
      },
      { status: 500 }
    );
  }
}

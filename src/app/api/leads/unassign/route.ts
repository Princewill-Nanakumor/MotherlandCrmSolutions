// app/api/leads/unassign/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";

interface UnassignLeadsRequest {
  leadIds: string[];
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
  assignedTo?:
    | {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
      }
    | mongoose.Types.ObjectId;
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
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { leadIds }: UnassignLeadsRequest = await request.json();

    if (!leadIds?.length) {
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
    const leadObjectIds = leadIds.map((id) => new mongoose.Types.ObjectId(id));
    const adminObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Get leads before update with multi-tenancy filter
    const beforeLeads = (await db
      .collection("leads")
      .find({
        _id: { $in: leadObjectIds },
        assignedTo: { $exists: true, $ne: null },
        adminId: adminObjectId, // Multi-tenancy: only leads belonging to this admin
      })
      .toArray()) as LeadDocument[];

    if (beforeLeads.length === 0) {
      return NextResponse.json(
        { message: "No valid leads found to unassign" },
        { status: 400 }
      );
    }

    // Get user doing the unassignment
    const assignedByUserResult = (await db
      .collection("users")
      .findOne(
        { _id: new mongoose.Types.ObjectId(session.user.id) },
        { projection: { firstName: 1, lastName: 1 } }
      )) as UserDocument | null;

    if (!assignedByUserResult) {
      throw new Error("User not found");
    }

    // Update leads and create activities
    const updatePromises = beforeLeads.map(async (lead) => {
      const now = new Date();
      const oldAssignedTo = lead.assignedTo;

      // Get the user being unassigned (handle both object and ObjectId formats)
      let unassignedUser: UserDocument | null = null;
      if (oldAssignedTo) {
        let userId: mongoose.Types.ObjectId;

        if (typeof oldAssignedTo === "object" && oldAssignedTo._id) {
          // If assignedTo is an object with _id
          userId = oldAssignedTo._id;
        } else if (oldAssignedTo instanceof mongoose.Types.ObjectId) {
          // If assignedTo is already an ObjectId
          userId = oldAssignedTo;
        } else {
          // If assignedTo is a string, convert to ObjectId
          userId = new mongoose.Types.ObjectId(oldAssignedTo.toString());
        }

        const unassignedUserResult = (await db
          .collection("users")
          .findOne(
            { _id: userId },
            { projection: { firstName: 1, lastName: 1 } }
          )) as UserDocument | null;

        unassignedUser = unassignedUserResult;
      }

      // Update lead
      const updatedLead = await db.collection("leads").findOneAndUpdate(
        { _id: lead._id },
        {
          $set: {
            assignedTo: null,
            updatedAt: now,
            lastActivityAt: now,
          },
        },
        { returnDocument: "after" }
      );

      // Create activity with multi-tenancy
      const activityData = {
        type: "ASSIGNMENT", // Using ASSIGNMENT type for unassignment too
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: `Lead unassigned from ${unassignedUser ? `${unassignedUser.firstName} ${unassignedUser.lastName}` : "Unknown User"}`,
        leadId: lead._id,
        adminId: adminObjectId, // Multi-tenancy
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
            _id: assignedByUserResult._id,
            firstName: assignedByUserResult.firstName,
            lastName: assignedByUserResult.lastName,
          },
        },
      };

      await db.collection("activities").insertOne(activityData);
      return updatedLead;
    });

    const results = await Promise.all(updatePromises);
    const updatedLeads = results.filter(Boolean);

    await Promise.allSettled(
      beforeLeads.map((lead) =>
        publishLeadUpdatedEvent(adminObjectId.toString(), lead._id.toString(), {
          type: "lead_unassigned_bulk",
          leadId: lead._id.toString(),
        })
      )
    );
    await publishAdminLeadsUpdatedEvent(adminObjectId.toString(), {
      type: "lead_unassigned_bulk",
      leadIds: beforeLeads.map((lead) => lead._id.toString()),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unassigned ${updatedLeads.length} leads`,
      unassignedCount: updatedLeads.length,
    });
  } catch (error) {
    console.error("Error in unassign endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error unassigning leads",
      },
      { status: 500 }
    );
  }
}

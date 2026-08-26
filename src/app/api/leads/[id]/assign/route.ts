// app/api/leads/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { canAssignLeads } from "@/lib/roles";
import {
  assertAssignmentCapacity,
  countLeadsAssignedToAgent,
  getLeadAssigneeId,
} from "@/lib/leadAssignmentQuery";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canAssignLeads(session.user)) {
    return forbiddenResponse("You do not have permission to assign leads");
  }

  const { userId } = await request.json();

  // Start database session for transaction
  const dbSession = await mongoose.startSession();
  let responsePayload:
    | { message: string; lead: unknown }
    | null = null;

  try {
    await dbSession.withTransaction(async () => {
      await connectMongoDB();

      // Extract the id from the URL: /api/leads/:id/assign
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const assignIdx = pathParts.lastIndexOf("assign");
      const id =
        assignIdx > 0 ? pathParts[assignIdx - 1] : pathParts[pathParts.length - 1];

      // Get the Lead model from mongoose
      const Lead = mongoose.models.Lead;
      if (!Lead) {
        throw new Error("Lead model not found");
      }

      // Build query with multi-tenancy filter
      const query: { _id: string; adminId?: string } = {
        _id: id,
      };

      const adminScope = await withAdminScope(session, async (adminId) => adminId);
      query.adminId = adminScope;
      if (!adminScope) {
        throw new Error("Admin scope not found for assignment");
      }

      // Get the current lead with populated assignedTo
      const currentLead = await Lead.findOne(query)
        .populate("assignedTo", "firstName lastName")
        .session(dbSession);

      if (!currentLead) {
        throw new Error("Lead not found or not authorized");
      }

      const oldAssignedTo = currentLead.assignedTo;
      const isReassignment = !!oldAssignedTo;
      const now = new Date();

      // Get user details for activity logging with multi-tenancy check
      const User = mongoose.model("User");
      const userQuery: { _id: string; adminId?: string } = {
        _id: userId,
      };

      // Only allow assigning to users created by the same admin
      userQuery.adminId = adminScope;

      const [assignedToUser, assignedByUser] = await Promise.all([
        User.findOne(userQuery).select("firstName lastName").session(dbSession),
        User.findById(session.user.id)
          .select("firstName lastName")
          .session(dbSession),
      ]);

      if (!assignedToUser) {
        throw new Error("Target user not found or not authorized");
      }

      const existingAssigneeId = getLeadAssigneeId(oldAssignedTo);
      if (existingAssigneeId !== userId) {
        const db = mongoose.connection.db;
        if (!db) {
          throw new Error("Database connection not available");
        }
        const currentCount = await countLeadsAssignedToAgent(
          db.collection("leads"),
          new mongoose.Types.ObjectId(adminScope),
          userId,
        );
        assertAssignmentCapacity(
          assignedToUser.firstName,
          assignedToUser.lastName,
          currentCount,
          1,
        );
      }

      // Update the lead
      const lead = await Lead.findOneAndUpdate(
        query, // Use the same query with multi-tenancy filter
        {
          assignedTo: userId,
          updatedAt: now,
          lastActivityAt: now,
        },
        { new: true, session: dbSession }
      ).populate("assignedTo", "firstName lastName");

      if (!lead) {
        throw new Error("Failed to update lead");
      }

      // Create activity log using the Activity model
      const Activity = mongoose.models.Activity;
      if (Activity) {
        const activity = new Activity({
          type: "ASSIGNMENT",
          userId: new mongoose.Types.ObjectId(session.user.id),
          details: isReassignment
            ? `Lead reassigned from ${oldAssignedTo ? `${oldAssignedTo.firstName} ${oldAssignedTo.lastName}` : "Unknown"} to ${assignedToUser.firstName} ${assignedToUser.lastName}`
            : `Lead assigned to ${assignedToUser.firstName} ${assignedToUser.lastName}`,
          leadId: new mongoose.Types.ObjectId(id),
          adminId: new mongoose.Types.ObjectId(adminScope), // Multi-tenancy
          timestamp: now,
          metadata: {
            assignedTo: {
              id: assignedToUser._id.toString(),
              firstName: assignedToUser.firstName,
              lastName: assignedToUser.lastName,
            },
            assignedFrom: oldAssignedTo
              ? {
                  id: oldAssignedTo._id.toString(),
                  firstName: oldAssignedTo.firstName,
                  lastName: oldAssignedTo.lastName,
                }
              : null,
            assignedBy: {
              id: assignedByUser._id.toString(),
              firstName: assignedByUser.firstName,
              lastName: assignedByUser.lastName,
            },
            performedBy: {
              id: assignedByUser._id.toString(),
              firstName: assignedByUser.firstName,
              lastName: assignedByUser.lastName,
            },
          },
        });

        await activity.save({ session: dbSession });
      }

      responsePayload = {
        message: isReassignment
          ? "Lead reassigned successfully"
          : "Lead assigned successfully",
        lead,
      };
    });

    // Publish after transaction succeeds so other clients refresh lead details/activity.
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const assignIdx = pathParts.lastIndexOf("assign");
      const id =
        assignIdx > 0 ? pathParts[assignIdx - 1] : pathParts[pathParts.length - 1];
      const adminScope = await withAdminScope(session, async (adminId) => adminId);
      if (adminScope) {
        await publishLeadUpdatedEvent(String(adminScope), id, {
          type: "lead_assigned",
          leadId: id,
        });
        await publishAdminLeadsUpdatedEvent(String(adminScope), {
          type: "lead_assigned",
          leadId: id,
        });
      }
    } catch (publishError) {
      console.error("Failed to publish realtime assignment event:", publishError);
    }

    return NextResponse.json(
      responsePayload ?? { message: "Lead assigned successfully" }
    );
  } catch (error) {
    console.error("Error assigning lead:", error);
    const message =
      error instanceof Error ? error.message : "Error assigning lead";
    const isClientError =
      message.includes("not found") ||
      message.includes("Cannot assign") ||
      message.includes("maximum");
    return NextResponse.json(
      { message },
      { status: isClientError ? 400 : 500 },
    );
  } finally {
    await dbSession.endSession();
  }
}

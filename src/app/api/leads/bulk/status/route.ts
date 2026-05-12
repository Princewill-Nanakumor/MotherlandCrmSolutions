// app/api/leads/bulk/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { rateLimitEnhanced } from "@/lib/rateLimit";

interface BulkStatusChangeRequest {
  leadIds: string[];
  status: string;
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
  status: string;
  adminId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
}

interface StatusDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!rateLimitEnhanced(request, 20, 60000)) {
      return NextResponse.json(
        { message: "Too many bulk status requests" },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return unauthorizedResponse();
    }

    const { leadIds, status: newStatus }: BulkStatusChangeRequest =
      await request.json();

    if (!leadIds?.length || !newStatus) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 }
      );
    }

    for (const id of leadIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json(
          { message: `Invalid lead id: ${id}`, code: "INVALID_LEAD_ID" },
          { status: 400 },
        );
      }
    }

    await connectMongoDB();

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;
    const leadObjectIds = leadIds.map((id) => new mongoose.Types.ObjectId(id));
    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    if (!adminScopeId) {
      return NextResponse.json(
        { message: "Admin scope not found for session user" },
        { status: 400 },
      );
    }
    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);

    // Validate status
    const commonStatuses = [
      "new",
      "NEW",
      "contacted",
      "CONTACTED",
      "qualified",
      "QUALIFIED",
      "converted",
      "CONVERTED",
    ];

    if (!commonStatuses.includes(newStatus)) {
      const statusCollection = db.collection("status");
      const statusesCollection = db.collection("statuses");
      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const statusQuery = {
          _id: new mongoose.Types.ObjectId(newStatus),
          adminId: adminObjectId, // Multi-tenancy check
        };
        const statusDoc =
          ((await statusCollection.findOne(statusQuery)) as StatusDocument | null) ??
          ((await statusesCollection.findOne(statusQuery)) as StatusDocument | null);

        if (!statusDoc) {
          return NextResponse.json(
            { message: "Invalid status ID" },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { message: "Invalid status format" },
          { status: 400 }
        );
      }
    }

    // Get status names for activity logs
    let newStatusName = newStatus;
    try {
      const statusCollection = db.collection("status");
      const statusesCollection = db.collection("statuses");
      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const statusQuery = { _id: new mongoose.Types.ObjectId(newStatus) };
        const statusDoc =
          ((await statusCollection.findOne(statusQuery)) as StatusDocument | null) ??
          ((await statusesCollection.findOne(statusQuery)) as StatusDocument | null);
        if (statusDoc?.name) {
          newStatusName = statusDoc.name;
        }
      }
    } catch (statusLookupError) {
      console.error("Status lookup error:", statusLookupError);
    }

    const mongoSession = await mongoose.startSession();
    let updatedLeads: mongoose.Types.ObjectId[] = [];
    try {
      await mongoSession.withTransaction(async () => {
        const beforeLeads = (await db
          .collection("leads")
          .find(
            {
              _id: { $in: leadObjectIds },
              adminId: adminObjectId,
            },
            { session: mongoSession },
          )
          .toArray()) as LeadDocument[];

        if (beforeLeads.length === 0) {
          throw new Error("NO_VALID_LEADS");
        }

        const changedLeads = beforeLeads.filter((lead) => lead.status !== newStatus);
        const now = new Date();

        for (const lead of changedLeads) {
          const previousStatus = lead.status;
          let previousStatusName = previousStatus;

          try {
            const statusCollection = db.collection("status");
            const statusesCollection = db.collection("statuses");
            if (mongoose.Types.ObjectId.isValid(previousStatus)) {
              const previousStatusQuery = {
                _id: new mongoose.Types.ObjectId(previousStatus),
              };
              const prevStatusDoc =
                ((await statusCollection.findOne(previousStatusQuery, {
                  session: mongoSession,
                })) as StatusDocument | null) ??
                ((await statusesCollection.findOne(previousStatusQuery, {
                  session: mongoSession,
                })) as StatusDocument | null);
              if (prevStatusDoc?.name) {
                previousStatusName = prevStatusDoc.name;
              }
            }
          } catch (error) {
            console.error("Error looking up previous status:", error);
          }

          await db.collection("leads").updateOne(
            { _id: lead._id, adminId: adminObjectId },
            {
              $set: {
                status: newStatus,
                updatedAt: now,
                statusChangedAt: now,
                lastActivityAt: now,
              },
            },
            { session: mongoSession },
          );

          await db.collection("activities").insertOne(
            {
              type: "STATUS_CHANGE",
              userId: new mongoose.Types.ObjectId(session.user.id),
              details: `Status changed from ${previousStatusName} to ${newStatusName}`,
              leadId: lead._id,
              adminId: adminObjectId,
              timestamp: now,
              metadata: {
                previousStatus,
                previousStatusName,
                newStatusId: newStatus,
                newStatusName,
                oldStatusId: previousStatus,
                oldStatus: previousStatusName,
                newStatus: newStatusName,
                performedBy: {
                  id: session.user.id,
                  firstName: (session.user as { firstName?: string }).firstName ?? "",
                  lastName: (session.user as { lastName?: string }).lastName ?? "",
                },
              },
            },
            { session: mongoSession },
          );
        }

        updatedLeads = changedLeads.map((lead) => lead._id);
      });
    } catch (error) {
      if (error instanceof Error && error.message === "NO_VALID_LEADS") {
        return NextResponse.json(
          { message: "No valid leads found to update" },
          { status: 400 },
        );
      }
      throw error;
    } finally {
      await mongoSession.endSession();
    }

    await Promise.allSettled(
      updatedLeads.map((leadId) =>
        publishLeadUpdatedEvent(adminObjectId.toString(), leadId!.toString(), {
          type: "bulk_status_changed",
          leadId: leadId!.toString(),
          status: newStatus,
        })
      )
    );
    if (updatedLeads.length > 0) {
      await publishAdminLeadsUpdatedEvent(adminObjectId.toString(), {
        type: "bulk_status_changed",
        status: newStatus,
        leadIds: updatedLeads.map((leadId) => leadId!.toString()),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated status for ${updatedLeads.length} leads`,
      updatedCount: updatedLeads.length,
    });
  } catch (error) {
    console.error("Error in bulk status change endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Error updating lead statuses",
      },
      { status: 500 }
    );
  }
}

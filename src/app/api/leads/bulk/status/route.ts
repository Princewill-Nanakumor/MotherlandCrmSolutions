// app/api/leads/bulk/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Activity from "@/models/Activity";

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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { leadIds, status: newStatus }: BulkStatusChangeRequest =
      await request.json();

    if (!leadIds?.length || !newStatus) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 }
      );
    }

    await connectMongoDB();

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
        adminId: adminObjectId, // Multi-tenancy: only leads belonging to this admin
      })
      .toArray()) as LeadDocument[];

    if (beforeLeads.length === 0) {
      return NextResponse.json(
        { message: "No valid leads found to update" },
        { status: 400 }
      );
    }

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
      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const statusDoc = (await db
          .collection("status")
          .findOne({
            _id: new mongoose.Types.ObjectId(newStatus),
            adminId: adminObjectId, // Multi-tenancy check
          })) as StatusDocument | null;

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
      if (mongoose.Types.ObjectId.isValid(newStatus)) {
        const statusDoc = (await db
          .collection("status")
          .findOne({
            _id: new mongoose.Types.ObjectId(newStatus),
          })) as StatusDocument | null;
        if (statusDoc?.name) {
          newStatusName = statusDoc.name;
        }
      }
    } catch (statusLookupError) {
      console.error("Status lookup error:", statusLookupError);
    }

    // Update leads and create activities
    const updatePromises = beforeLeads.map(async (lead) => {
      const previousStatus = lead.status;

      // Get previous status name
      let previousStatusName = previousStatus;
      try {
        if (mongoose.Types.ObjectId.isValid(previousStatus)) {
          const prevStatusDoc = (await db
            .collection("status")
            .findOne({
              _id: new mongoose.Types.ObjectId(previousStatus),
            })) as StatusDocument | null;
          if (prevStatusDoc?.name) {
            previousStatusName = prevStatusDoc.name;
          }
        }
      } catch (error) {
        console.error("Error looking up previous status:", error);
      }

      // Skip if status is the same
      if (previousStatus === newStatus) {
        return null;
      }

      // Update lead
      const now = new Date();
      await db.collection("leads").findOneAndUpdate(
        { _id: lead._id },
        {
          $set: {
            status: newStatus,
            updatedAt: now,
            statusChangedAt: now,
          },
        }
      );

      // Create activity log
      try {
        await Activity.create({
          type: "STATUS_CHANGE",
          userId: new mongoose.Types.ObjectId(session.user.id),
          details: `Status changed from ${previousStatusName} to ${newStatusName}`,
          leadId: lead._id,
          adminId: adminObjectId,
          timestamp: new Date(),
          metadata: {
            previousStatus: previousStatus,
            previousStatusName: previousStatusName,
            newStatusId: newStatus,
            newStatusName: newStatusName,
            oldStatusId: previousStatus,
            oldStatus: previousStatusName,
            newStatus: newStatusName,
            performedBy: {
              id: session.user.id,
              firstName: (session.user as { firstName?: string }).firstName ?? "",
              lastName: (session.user as { lastName?: string }).lastName ?? "",
            },
          },
        });
      } catch (activityError) {
        console.error("Error creating activity log:", activityError);
      }

      return lead._id;
    });

    const results = await Promise.all(updatePromises);
    const updatedLeads = results.filter((id) => id !== null);

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


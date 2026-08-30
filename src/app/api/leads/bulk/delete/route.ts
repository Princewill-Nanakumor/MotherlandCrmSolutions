// app/api/leads/bulk/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import { canDeleteLead } from "@/lib/roles";

interface BulkDeleteRequest {
  leadIds: string[];
}

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
}

export async function POST(request: NextRequest) {
  try {
    if (!rateLimitEnhanced(request, 20, 60000, "leads-bulk-delete")) {
      return NextResponse.json(
        { message: "Too many bulk delete requests" },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !canDeleteLead(session.user)) {
      return unauthorizedResponse();
    }

    const { leadIds }: BulkDeleteRequest = await request.json();

    if (!leadIds?.length) {
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

    const mongoSession = await mongoose.startSession();
    let deletedCount = 0;
    let deletedLeadIds: string[] = [];
    try {
      await mongoSession.withTransaction(async () => {
        const leadsToDelete = (await db
          .collection("leads")
          .find(
            {
              _id: { $in: leadObjectIds },
              adminId: adminObjectId,
            },
            { session: mongoSession },
          )
          .toArray()) as LeadDocument[];

        if (leadsToDelete.length === 0) {
          throw new Error("NO_VALID_LEADS");
        }

        const leadIdsToDelete = leadsToDelete.map((lead) => lead._id);
        deletedLeadIds = leadIdsToDelete.map((id) => id.toString());

        const deleteResult = await db.collection("leads").deleteMany(
          {
            _id: { $in: leadIdsToDelete },
            adminId: adminObjectId,
          },
          { session: mongoSession },
        );
        deletedCount = deleteResult.deletedCount ?? 0;

        await db.collection("activities").deleteMany(
          {
            leadId: { $in: leadIdsToDelete },
            adminId: adminObjectId,
          },
          { session: mongoSession },
        );
      });
    } catch (error) {
      if (error instanceof Error && error.message === "NO_VALID_LEADS") {
        return NextResponse.json(
          { message: "No valid leads found to delete" },
          { status: 400 },
        );
      }
      throw error;
    } finally {
      await mongoSession.endSession();
    }

    if (deletedCount > 0) {
      try {
        await publishAdminLeadsUpdatedEvent(adminScopeId, {
          type: "bulk_deleted",
          leadIds: deletedLeadIds,
          deletedCount,
        });
      } catch (publishError) {
        console.error("Failed to publish realtime bulk delete event:", publishError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} leads`,
      deletedCount,
    });
  } catch (error) {
    console.error("Error in bulk delete endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Error deleting leads",
      },
      { status: 500 }
    );
  }
}


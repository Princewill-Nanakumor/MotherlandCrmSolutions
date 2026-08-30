// app/api/leads/bulk/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import {
  publishAdminLeadsUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import { canEditAnyLeadStatus } from "@/lib/roles";
import {
  insertActivitiesInChunks,
  MAX_BULK_LEAD_OPS,
} from "@/lib/bulkLeadOps";

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

async function resolveStatusName(
  db: NonNullable<typeof mongoose.connection.db>,
  statusValue: string,
): Promise<string> {
  if (!mongoose.Types.ObjectId.isValid(statusValue)) {
    return statusValue;
  }
  const statusQuery = { _id: new mongoose.Types.ObjectId(statusValue) };
  const statusDoc =
    ((await db.collection("status").findOne(statusQuery)) as StatusDocument | null) ??
    ((await db.collection("statuses").findOne(statusQuery)) as StatusDocument | null);
  return statusDoc?.name || statusValue;
}

async function resolveStatusNamesById(
  db: NonNullable<typeof mongoose.connection.db>,
  statusValues: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const objectIds: mongoose.Types.ObjectId[] = [];

  for (const value of statusValues) {
    if (!value) continue;
    if (mongoose.Types.ObjectId.isValid(value)) {
      objectIds.push(new mongoose.Types.ObjectId(value));
    } else {
      names.set(value, value);
    }
  }

  if (objectIds.length === 0) return names;

  const query = { _id: { $in: objectIds } };
  const [fromStatus, fromStatuses] = await Promise.all([
    db.collection("status").find(query).toArray(),
    db.collection("statuses").find(query).toArray(),
  ]);

  for (const doc of [...fromStatus, ...fromStatuses] as StatusDocument[]) {
    if (doc?._id && doc.name) {
      names.set(doc._id.toString(), doc.name);
    }
  }

  return names;
}

export async function POST(request: NextRequest) {
  try {
    if (!rateLimitEnhanced(request, 20, 60000, "leads-bulk-status")) {
      return NextResponse.json(
        { message: "Too many bulk status requests" },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !canEditAnyLeadStatus(session.user)) {
      return unauthorizedResponse();
    }

    const { leadIds, status: newStatus }: BulkStatusChangeRequest =
      await request.json();

    if (!leadIds?.length || !newStatus) {
      return NextResponse.json(
        { message: "Invalid request data" },
        { status: 400 },
      );
    }

    if (leadIds.length > MAX_BULK_LEAD_OPS) {
      return NextResponse.json(
        {
          message: `Cannot change status for more than ${MAX_BULK_LEAD_OPS} leads at once`,
          code: "BULK_STATUS_LIMIT",
        },
        { status: 400 },
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
            { status: 400 },
          );
        }
      } else {
        return NextResponse.json(
          { message: "Invalid status format" },
          { status: 400 },
        );
      }
    }

    const newStatusName = await resolveStatusName(db, newStatus);

    const beforeLeads = (await db
      .collection("leads")
      .find({
        _id: { $in: leadObjectIds },
        adminId: adminObjectId,
      })
      .toArray()) as LeadDocument[];

    if (beforeLeads.length === 0) {
      return NextResponse.json(
        { message: "No valid leads found to update" },
        { status: 400 },
      );
    }

    const changedLeads = beforeLeads.filter((lead) => lead.status !== newStatus);
    if (changedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Successfully updated status for 0 leads",
        updatedCount: 0,
      });
    }

    const previousNames = await resolveStatusNamesById(
      db,
      changedLeads.map((lead) => lead.status),
    );

    const now = new Date();
    const changedIds = changedLeads.map((lead) => lead._id);
    const performedBy = {
      id: session.user.id,
      firstName: (session.user as { firstName?: string }).firstName ?? "",
      lastName: (session.user as { lastName?: string }).lastName ?? "",
    };

    // No multi-doc transaction: Atlas aborts long per-lead txn loops (~500× update+insert).
    // Same pattern as /api/leads/assign (bulk-friendly, no session).
    await db.collection("leads").updateMany(
      {
        _id: { $in: changedIds },
        adminId: adminObjectId,
      },
      {
        $set: {
          status: newStatus,
          updatedAt: now,
          statusChangedAt: now,
          lastActivityAt: now,
        },
      },
    );

    const activities = changedLeads.map((lead) => {
      const previousStatus = lead.status;
      const previousStatusName =
        previousNames.get(previousStatus) || previousStatus;
      return {
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
          performedBy,
        },
      };
    });

    await insertActivitiesInChunks(db, activities);

    await publishAdminLeadsUpdatedEvent(adminObjectId.toString(), {
      type: "bulk_status_changed",
      status: newStatus,
      leadIds: changedIds.map((leadId) => leadId.toString()),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated status for ${changedIds.length} leads`,
      updatedCount: changedIds.length,
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
      { status: 500 },
    );
  }
}

// /Users/safeconnection/Downloads/drivecrm-main/src/app/api/leads/[id]/route.ts
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { Db, ObjectId } from "mongodb";
import { publishLeadUpdatedEvent } from "@/libs/ablyServer";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { agentAssignedToUserClause } from "@/lib/leadAssignmentQuery";

function buildLeadAccessFilter(
  session: Session,
  adminScopeId: string,
  baseIdFilter: { _id?: ObjectId; leadId?: string | number },
): Record<string, unknown> {
  const adminOid = new ObjectId(adminScopeId);
  const core: Record<string, unknown> = { ...baseIdFilter, adminId: adminOid };

  if (session.user.role !== "AGENT") {
    return core;
  }

  return {
    $and: [core, agentAssignedToUserClause(session.user.id)],
  };
}

function maskEmail(email: string, visible: boolean): string {
  if (visible || !email) return email;
  const at = email.indexOf("@");
  if (at <= 0) return "••••••••";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const keep = Math.min(2, local.length);
  return `${local.slice(0, keep)}•••@${domain}`;
}

function maskPhone(phone: string, visible: boolean): string {
  if (visible || !phone) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••••••${digits.slice(-4)}`;
}

// Helper to get user details for assignedTo
async function getAssignedToUser(
  db: Db,
  assignedTo: ObjectId | string | null | undefined,
) {
  if (!assignedTo) return null;

  try {
    const user = await db.collection("users").findOne(
      {
        _id:
          typeof assignedTo === "string"
            ? new ObjectId(assignedTo)
            : assignedTo,
      },
      { projection: { firstName: 1, lastName: 1, email: 1 } },
    );

    if (!user) return null;

    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  } catch (error) {
    console.error("Error getting assigned user:", error);
    return null;
  }
}

// GET /api/leads/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    await connectMongoDB();
    const { id } = await params;

    const db = mongoose.connection.db;
    if (!db) throw new Error("Database connection not available");

    // Support legacy numeric leadId, new LD-* leadId, and MongoDB _id.
    const isLegacyNumericLeadId = /^\d{5,6}$/.test(id);
    const isPrefixedLeadId = /^LD-[A-Za-z0-9_-]+$/i.test(id);
    const baseQuery: { _id?: ObjectId; leadId?: string | number } = {};

    if (isLegacyNumericLeadId) {
      baseQuery.leadId = parseInt(id, 10);
    } else if (isPrefixedLeadId) {
      baseQuery.leadId = id.toUpperCase();
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      // Search by MongoDB _id
      baseQuery._id = new ObjectId(id);
    } else {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    const query = buildLeadAccessFilter(session, adminScopeId, baseQuery);

    const lead = await db.collection("leads").findOne(query);

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    // Normalize assignedTo: in DB it can be ObjectId, string, or object { _id, firstName, lastName }
    let assignedToUserId: ObjectId | string | null = null;
    if (lead.assignedTo) {
      if (
        typeof lead.assignedTo === "object" &&
        lead.assignedTo !== null &&
        "_id" in lead.assignedTo
      ) {
        assignedToUserId = (lead.assignedTo as { _id: ObjectId })._id;
      } else if (typeof lead.assignedTo === "string") {
        assignedToUserId = lead.assignedTo;
      } else {
        assignedToUserId = lead.assignedTo as ObjectId;
      }
    }

    // Populate assignedTo with user details
    const assignedToUser = await getAssignedToUser(
      db as unknown as Db,
      assignedToUserId,
    );

    const transformedLead = {
      _id: lead._id.toString(),
      id: lead._id.toString(),
      leadId: lead.leadId || undefined,
      firstName: lead.firstName,
      lastName: lead.lastName,
      name: `${lead.firstName} ${lead.lastName}`,
      // Anyone who can read this lead by id may use full contact (dialer / copy).
      // List endpoints may still mask; this route is the panel detail source of truth.
      email: maskEmail(
        typeof lead.email === "string" ? lead.email : "",
        true,
      ),
      phone: maskPhone(
        typeof lead.phone === "string" ? lead.phone : "",
        true,
      ),
      source: lead.source && lead.source !== "-" ? lead.source : "—",
      status: lead.status,
      country: lead.country || "",
      assignedTo: assignedToUser, // This will be { id, firstName, lastName, email } or null
      createdAt:
        lead.createdAt instanceof Date
          ? lead.createdAt.toISOString()
          : lead.createdAt,
      updatedAt:
        lead.updatedAt instanceof Date
          ? lead.updatedAt.toISOString()
          : lead.updatedAt,
      statusChangedAt: lead.statusChangedAt
        ? lead.statusChangedAt instanceof Date
          ? lead.statusChangedAt.toISOString()
          : String(lead.statusChangedAt)
        : undefined,
      comments: lead.comments || "",
    };

    return NextResponse.json(transformedLead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 },
    );
  }
}

// PUT /api/leads/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    const updateData = await request.json();
    await connectMongoDB();
    const { id } = await params;

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    const isLegacyNumericLeadId = /^\d{5,6}$/.test(id);
    const isPrefixedLeadId = /^LD-[A-Za-z0-9_-]+$/i.test(id);
    const baseQuery: { _id?: ObjectId; leadId?: string | number } = {};

    if (isLegacyNumericLeadId) {
      baseQuery.leadId = parseInt(id, 10);
    } else if (isPrefixedLeadId) {
      baseQuery.leadId = id.toUpperCase();
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      // Search by MongoDB _id
      baseQuery._id = new ObjectId(id);
    } else {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    const query = buildLeadAccessFilter(session, adminScopeId, baseQuery);

    const currentLead = await db.collection("leads").findOne(query);

    if (!currentLead) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    // Prepare the update payload
    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const isAgent = session.user.role === "AGENT";

    if (isAgent) {
      let agentHasUpdate = false;
      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status;
        updatePayload.statusChangedAt = new Date();
        agentHasUpdate = true;
      }
      if (updateData.comments !== undefined) {
        updatePayload.comments = updateData.comments;
        agentHasUpdate = true;
      }
      if (!agentHasUpdate) {
        return NextResponse.json(
          { error: "Agents may only update status and comments" },
          { status: 400 },
        );
      }
    } else {
      if (updateData.firstName !== undefined)
        updatePayload.firstName = String(updateData.firstName || "").trim();
      if (updateData.lastName !== undefined)
        updatePayload.lastName = String(updateData.lastName || "").trim();
      if (updateData.email !== undefined) {
        updatePayload.email = String(updateData.email || "")
          .toLowerCase()
          .trim();
      }
      if (updateData.phone !== undefined)
        updatePayload.phone = String(updateData.phone || "").trim();
      if (updateData.source !== undefined)
        updatePayload.source = String(updateData.source || "").trim();
      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status;
        updatePayload.statusChangedAt = new Date();
      }
      if (updateData.country !== undefined)
        updatePayload.country = String(updateData.country || "").trim();
      if (updateData.comments !== undefined)
        updatePayload.comments = updateData.comments;
    }

    // Handle assignedTo field (admins only — agents cannot reassign leads via this API)
    if (updateData.assignedTo !== undefined && session.user.role !== "AGENT") {
      if (updateData.assignedTo) {
        if (!mongoose.Types.ObjectId.isValid(updateData.assignedTo)) {
          return NextResponse.json(
            { error: "Invalid assignedTo user ID" },
            { status: 400 },
          );
        }
        updatePayload.assignedTo = new ObjectId(updateData.assignedTo);
      } else {
        updatePayload.assignedTo = null;
      }
    }

    // Perform the update
    const updateResult = await db
      .collection("leads")
      .updateOne(query, { $set: updatePayload });

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    // Check if document was actually modified
    if (updateResult.modifiedCount === 0) {
      const changes: string[] = [];
      Object.keys(updatePayload).forEach((key) => {
        if (key !== "updatedAt" && currentLead[key] !== updatePayload[key]) {
          changes.push(
            `${key}: "${currentLead[key]}" → "${updatePayload[key]}"`,
          );
        }
      });

      // If there were supposed to be changes but nothing was modified, that's an error
      if (changes.length > 0) {
        console.error("Lead update failed - changes not saved:", changes);
        return NextResponse.json(
          {
            error: "Database update failed - no changes were saved",
            details:
              "The update operation completed but no fields were modified in the database.",
            attemptedChanges: changes,
          },
          { status: 500 },
        );
      }
    }

    // Fetch the updated document
    const updatedLead = await db.collection("leads").findOne(query);

    if (!updatedLead || !updatedLead._id) {
      return NextResponse.json(
        { error: "Failed to retrieve updated lead" },
        { status: 500 },
      );
    }

    // Populate assignedTo with user details for the response
    const assignedToUser = await getAssignedToUser(
      db as unknown as Db,
      updatedLead.assignedTo,
    );

    const transformedLead = {
      _id: updatedLead._id.toString(),
      id: updatedLead._id.toString(),
      leadId: updatedLead.leadId || undefined,
      firstName: updatedLead.firstName,
      lastName: updatedLead.lastName,
      name: `${updatedLead.firstName} ${updatedLead.lastName}`,
      email: maskEmail(
        typeof updatedLead.email === "string" ? updatedLead.email : "",
        true,
      ),
      phone: maskPhone(
        typeof updatedLead.phone === "string" ? updatedLead.phone : "",
        true,
      ),
      source: updatedLead.source,
      status: updatedLead.status,
      country: updatedLead.country || "",
      assignedTo: assignedToUser,
      createdAt:
        updatedLead.createdAt instanceof Date
          ? updatedLead.createdAt.toISOString()
          : updatedLead.createdAt,
      updatedAt:
        updatedLead.updatedAt instanceof Date
          ? updatedLead.updatedAt.toISOString()
          : updatedLead.updatedAt,
      statusChangedAt: updatedLead.statusChangedAt
        ? (updatedLead.statusChangedAt instanceof Date
            ? updatedLead.statusChangedAt.toISOString()
            : String(updatedLead.statusChangedAt))
        : undefined,
      comments: updatedLead.comments || "",
    };

    try {
      await publishLeadUpdatedEvent(String(adminScopeId), id, {
        type: "lead_updated",
        leadId: id,
      });
    } catch (publishError) {
      console.error("Failed to publish realtime lead update event:", publishError);
    }

    return NextResponse.json(transformedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      {
        error: "Failed to update lead",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

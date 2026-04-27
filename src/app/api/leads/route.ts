// src/app/api/leads/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import Lead, { generateLeadId } from "@/models/Lead";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { agentLeadsInTenantFilter, singleLeadAccessFilter } from "@/lib/leadAssignmentQuery";
import { maskEmail, maskPhone } from "@/lib/contactMasking";
import { checkTenantLeadImportAllowed } from "@/lib/tenantLeadImportLimits";

interface MongoDocument {
  _id: mongoose.Types.ObjectId;
  id?: string;
}

interface LeadDocument extends MongoDocument {
  leadId?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  source?: string;
  status: string;
  adminId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  statusChangedAt?: Date | string | null;
  __v: number;
}

interface TransformedLead {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  source: string;
  country: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Allow-list of fields callers may set via PUT. Anything else (adminId,
// createdBy, leadId, _id, __v…) is silently dropped to block mass-assignment.
const LEAD_UPDATABLE_FIELDS = new Set([
  "firstName",
  "lastName",
  "email",
  "phone",
  "country",
  "source",
  "status",
  "comments",
  "assignedTo",
] as const);

function pickUpdatableFields(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (LEAD_UPDATABLE_FIELDS.has(key as never)) {
      out[key] = input[key];
    }
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();

    const adminScopeId = await withAdminScope(session, async (id) => id);
    if (!adminScopeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role === "AGENT" && !session.user.adminId) {
      return forbiddenResponse("Admin scope unresolved");
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "15")),
    );
    const skip = (page - 1) * limit;

    return executeDbOperation(async () => {
      const tenantOid = new mongoose.Types.ObjectId(adminScopeId);
      const query =
        session.user.role === "AGENT"
          ? agentLeadsInTenantFilter(tenantOid, session.user.id)
          : { adminId: tenantOid };

      let canViewEmails = session.user.role !== "AGENT";
      let canViewPhoneNumbers = session.user.role !== "AGENT";
      if (session.user.role === "AGENT" && mongoose.connection.db) {
        const me = await mongoose.connection.db.collection("users").findOne(
          { _id: new mongoose.Types.ObjectId(session.user.id) },
          { projection: { canViewEmails: 1, canViewPhoneNumbers: 1 } },
        );
        canViewEmails = Boolean(me?.canViewEmails);
        canViewPhoneNumbers = Boolean(me?.canViewPhoneNumbers);
      }

      const [leads, total] = await Promise.all([
        Lead.find(query)
          .select(
            "leadId firstName lastName email phone country source status createdAt updatedAt statusChangedAt",
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<LeadDocument[]>(),
        Lead.countDocuments(query),
      ]);

      const transformedLeads: TransformedLead[] = leads.map(
        (lead: LeadDocument) => ({
          _id: lead._id.toString(),
          leadId: lead.leadId || undefined,
          firstName: lead.firstName,
          lastName: lead.lastName,
          fullName: `${lead.firstName} ${lead.lastName}`,
          email: maskEmail(lead.email, canViewEmails),
          phone: maskPhone(lead.phone || "", canViewPhoneNumbers),
          source: lead.source && lead.source !== "-" ? lead.source : "—",
          country: lead.country || "",
          status: lead.status || "NEW",
          createdAt: new Date(lead.createdAt).toISOString(),
          updatedAt: new Date(lead.updatedAt).toISOString(),
          statusChangedAt: lead.statusChangedAt
            ? new Date(lead.statusChangedAt).toISOString()
            : undefined,
        }),
      );

      return NextResponse.json({
        leads: transformedLeads,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit,
        },
      });
    }, "Error fetching leads");
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let requestData;
  try {
    requestData = await request.json();
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 },
    );
  }

  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only administrators can create or import leads");
    }

    const scopedAdminId = await withAdminScope(
      session,
      async (adminId) => adminId,
    );
    if (!scopedAdminId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const scopedAdminObjectId = new mongoose.Types.ObjectId(scopedAdminId);

    const leads = Array.isArray(requestData) ? requestData : [requestData];

    // Single-lead creation path: rely on the unique (email, adminId) index to
    // catch duplicates atomically. The pre-`findOne` we used to do is a TOCTOU.
    if (leads.length === 1 && !leads[0]?.importId) {
      const leadData = leads[0];
      if (!leadData?.email || typeof leadData.email !== "string") {
        return NextResponse.json(
          { error: "Email is required" },
          { status: 400 },
        );
      }

      if (!mongoose.connection.db) {
        throw new Error("Database connection not available");
      }
      const singleLimit = await checkTenantLeadImportAllowed(
        mongoose.connection.db,
        {
          adminObjectId: scopedAdminObjectId,
          newLeadCount: 1,
        },
      );
      if (!singleLimit.ok) {
        return NextResponse.json(singleLimit.body, { status: singleLimit.status });
      }

      try {
        const newLead = await Lead.create({
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email.toLowerCase(),
          phone: leadData.phone || "",
          country: leadData.country || "",
          source: leadData.source || "Manual Entry",
          comments: leadData.comments || "No comments yet",
          status: leadData.status || "NEW",
          adminId: scopedAdminObjectId,
          createdBy: new mongoose.Types.ObjectId(session.user.id),
        });

        return NextResponse.json({
          message: "Lead created successfully",
          inserted: 1,
          duplicates: 0,
          errors: 0,
          lead: {
            _id: newLead._id.toString(),
            leadId: newLead.leadId,
            firstName: newLead.firstName,
            lastName: newLead.lastName,
            email: newLead.email,
          },
        });
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 11000
        ) {
          return NextResponse.json(
            { error: "A lead with this email already exists" },
            { status: 400 },
          );
        }
        console.error("Error creating lead:", error);
        throw error;
      }
    }

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const normalizedBulkRows: Array<(typeof leads)[0] & { _normalizedEmail: string }> =
      [];
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      if (!lead?.email || typeof lead.email !== "string") {
        return NextResponse.json(
          {
            error: `Import row ${i + 1}: a non-empty string email is required`,
            code: "INVALID_IMPORT_ROW",
            row: i + 1,
          },
          { status: 400 },
        );
      }
      const normalized = lead.email.trim().toLowerCase();
      if (!normalized) {
        return NextResponse.json(
          {
            error: `Import row ${i + 1}: email cannot be blank`,
            code: "INVALID_IMPORT_ROW",
            row: i + 1,
          },
          { status: 400 },
        );
      }
      normalizedBulkRows.push({ ...lead, _normalizedEmail: normalized });
    }

    const uniqueEmails = [
      ...new Set(normalizedBulkRows.map((r) => r._normalizedEmail)),
    ];
    const alreadyHave = await Lead.find({
      adminId: scopedAdminObjectId,
      email: { $in: uniqueEmails },
    })
      .select({ email: 1 })
      .lean<{ email: string }[]>();
    const existingEmailSet = new Set(
      alreadyHave.map((d) => String(d.email).trim().toLowerCase()),
    );
    const wouldInsertCount = uniqueEmails.filter(
      (e) => !existingEmailSet.has(e),
    ).length;

    const bulkLimit = await checkTenantLeadImportAllowed(
      mongoose.connection.db,
      {
        adminObjectId: scopedAdminObjectId,
        newLeadCount: wouldInsertCount,
      },
    );
    if (!bulkLimit.ok) {
      return NextResponse.json(bulkLimit.body, { status: bulkLimit.status });
    }

    // Bulk path (imports): generate collision-resistant leadIds.
    const operations = [];
    for (const lead of normalizedBulkRows) {
      const leadId = await generateLeadId();
      operations.push({
        updateOne: {
          filter: {
            email: lead._normalizedEmail,
            adminId: scopedAdminObjectId,
          },
          update: {
            $setOnInsert: {
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead._normalizedEmail,
              phone: lead.phone || "",
              country: lead.country || "",
              source: lead.source || "—",
              comments: lead.comments || "No comments yet",
              status: lead.status || "NEW",
              importId: lead.importId,
              leadId,
              adminId: scopedAdminObjectId,
              createdBy: new mongoose.Types.ObjectId(session.user.id),
              createdAt: new Date(),
            },
            $set: {
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    let inserted = 0;
    let duplicates = 0;
    let errors = 0;

    try {
      const result = await Lead.bulkWrite(operations, { ordered: false });
      inserted = result.upsertedCount;
      duplicates = leads.length - inserted;
    } catch (error) {
      console.error("Bulk import error:", error);
      errors = leads.length - inserted;
    }

    const importId = leads[0]?.importId;
    if (importId && mongoose.connection && mongoose.connection.db) {
      try {
        await mongoose.connection.db.collection("imports").updateOne(
          { _id: new mongoose.Types.ObjectId(importId) },
          {
            $set: {
              status: "completed",
              successCount: inserted,
              failureCount: duplicates + errors,
              updatedAt: new Date(),
            },
          },
        );
      } catch (error) {
        console.error("Error updating import status:", error);
      }
    }

    return NextResponse.json({
      message: "Leads processed",
      inserted,
      duplicates,
      errors,
    });
  }, "Failed to process leads");
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();

    const adminScopeId = await withAdminScope(session, async (id) => id);
    if (!adminScopeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body ?? {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid lead id is required" },
        { status: 400 },
      );
    }

    const safeUpdate = pickUpdatableFields(
      updateData as Record<string, unknown>,
    );
    if (session.user.role === "AGENT") {
      delete safeUpdate.assignedTo;
      const agentAllowed = new Set(["status", "comments"]);
      for (const key of Object.keys(safeUpdate)) {
        if (!agentAllowed.has(key)) {
          delete safeUpdate[key];
        }
      }
    }
    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    if (
      "assignedTo" in safeUpdate &&
      safeUpdate.assignedTo &&
      !mongoose.Types.ObjectId.isValid(safeUpdate.assignedTo as string)
    ) {
      return NextResponse.json(
        { error: "Invalid assignedTo id" },
        { status: 400 },
      );
    }

    return executeDbOperation(async () => {
      const leadOid = new mongoose.Types.ObjectId(id);
      const tenantOid = new mongoose.Types.ObjectId(adminScopeId);
      const accessFilter = singleLeadAccessFilter(
        leadOid,
        tenantOid,
        session.user.role,
        session.user.id,
      );

      const updatedLead = await Lead.findOneAndUpdate(
        accessFilter,
        { ...safeUpdate, updatedAt: new Date() },
        { new: true },
      ).lean<LeadDocument>();

      if (!updatedLead) {
        return NextResponse.json(
          { error: "Lead not found or not authorized" },
          { status: 404 },
        );
      }

      return NextResponse.json(updatedLead);
    }, "Error updating lead");
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();

    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only administrators can delete leads");
    }

    const adminScopeId = await withAdminScope(session, async (id) => id);
    if (!adminScopeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Valid lead id is required" },
        { status: 400 },
      );
    }

    return executeDbOperation(async () => {
      const leadOid = new mongoose.Types.ObjectId(id);
      const tenantOid = new mongoose.Types.ObjectId(adminScopeId);

      const deletedLead = await Lead.findOneAndDelete({
        _id: leadOid,
        adminId: tenantOid,
      }).lean<LeadDocument>();

      if (!deletedLead) {
        return NextResponse.json(
          { error: "Lead not found or not authorized" },
          { status: 404 },
        );
      }

      return NextResponse.json({ message: "Lead deleted successfully" });
    }, "Error deleting lead");
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 },
    );
  }
}

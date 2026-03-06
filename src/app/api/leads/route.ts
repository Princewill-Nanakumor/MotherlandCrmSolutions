// /Users/safeconnection/Downloads/drivecrm/src/app/api/leads/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import Lead, { generateLeadId } from "@/models/Lead";
import User from "@/models/User";

interface MongoDocument {
  _id: mongoose.Types.ObjectId;
  id?: string;
}

interface LeadDocument extends MongoDocument {
  leadId?: number;
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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "15");
    const skip = (page - 1) * limit;

    return executeDbOperation(async () => {
      const query: { adminId?: mongoose.Types.ObjectId } = {};

      if (session.user.role === "ADMIN") {
        query.adminId = new mongoose.Types.ObjectId(session.user.id);
      } else if (session.user.role === "AGENT" && session.user.adminId) {
        query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
      }

      const [leads, total] = await Promise.all([
        Lead.find(query)
          .select(
            "leadId firstName lastName email phone country source status createdAt updatedAt statusChangedAt"
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
          email: lead.email,
          phone: lead.phone || "",
          source: lead.source && lead.source !== "-" ? lead.source : "—",
          country: lead.country || "",
          status: lead.status || "NEW",
          createdAt: new Date(lead.createdAt).toISOString(),
          updatedAt: new Date(lead.updatedAt).toISOString(),
          statusChangedAt: lead.statusChangedAt
            ? new Date(lead.statusChangedAt).toISOString()
            : undefined,
        })
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
      { status: 500 }
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
      { status: 400 }
    );
  }

  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = Array.isArray(requestData) ? requestData : [requestData];
    console.log("Received leads to import:", leads.length);

    // For single lead creation, use Mongoose create to trigger pre-save hook
    if (leads.length === 1 && !leads[0]?.importId) {
      const leadData = leads[0];
      try {
        // Check if lead already exists
        const existingLead = await Lead.findOne({
          email: leadData.email.toLowerCase(),
          adminId: new mongoose.Types.ObjectId(session.user.id),
        });

        if (existingLead) {
          return NextResponse.json(
            { error: "A lead with this email already exists" },
            { status: 400 }
          );
        }

        // Create new lead - this will trigger the pre-save hook to generate leadId
        const newLead = await Lead.create({
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          email: leadData.email.toLowerCase(),
          phone: leadData.phone || "",
          country: leadData.country || "",
          source: leadData.source || "Manual Entry",
          comments: leadData.comments || "No comments yet",
          status: leadData.status || "NEW",
          adminId: new mongoose.Types.ObjectId(session.user.id),
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
        console.error("Error creating lead:", error);
        if (error && typeof error === "object" && "code" in error && error.code === 11000) {
          return NextResponse.json(
            { error: "A lead with this email already exists" },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    // For bulk operations (imports), generate leadIds sequentially to avoid duplicates
    // Prepare bulk operations with generated leadIds
    const operations = [];
    for (const lead of leads) {
      // Generate leadId for new documents (will be set on insert)
      // Generate sequentially to avoid race conditions
      const leadId = await generateLeadId();
      
      operations.push({
        updateOne: {
          filter: {
            email: lead.email.toLowerCase(),
            adminId: new mongoose.Types.ObjectId(session.user.id),
          },
          update: {
            $setOnInsert: {
              firstName: lead.firstName,
              lastName: lead.lastName,
              email: lead.email.toLowerCase(),
              phone: lead.phone || "",
              country: lead.country || "",
              source: lead.source || "—",
              comments: lead.comments || "No comments yet",
              status: lead.status || "NEW",
              importId: lead.importId,
              leadId: leadId, // Add generated leadId
              adminId: new mongoose.Types.ObjectId(session.user.id),
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
      // The unique index on leadId will prevent duplicates at the database level
      // If a duplicate leadId is generated, MongoDB will reject it with E11000 error
      const result = await Lead.bulkWrite(operations, { ordered: false });
      inserted = result.upsertedCount;
      duplicates = leads.length - inserted;
    } catch (error) {
      console.error("Bulk import error:", error);
      // Check if it's a duplicate key error (E11000) - this could be duplicate leadId
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        console.error("Duplicate key error detected - this may indicate a duplicate leadId");
        // The unique index on leadId will prevent this, but if it happens,
        // the generateLeadId function should have prevented it
      }
      errors = leads.length - inserted; // fallback, or parse error for more detail
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
          }
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, ...updateData } = await request.json();

    return executeDbOperation(async () => {
      const query: {
        _id: mongoose.Types.ObjectId;
        adminId?: mongoose.Types.ObjectId;
      } = {
        _id: new mongoose.Types.ObjectId(id),
      };

      if (session.user.role === "ADMIN") {
        query.adminId = new mongoose.Types.ObjectId(session.user.id);
      } else if (session.user.role === "AGENT" && session.user.adminId) {
        query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
      }

      const updatedLead = await Lead.findOneAndUpdate(
        query,
        {
          ...updateData,
          updatedAt: new Date(),
        },
        { new: true }
      ).lean<LeadDocument>();

      if (!updatedLead) {
        return NextResponse.json(
          { error: "Lead not found or not authorized" },
          { status: 404 }
        );
      }

      return NextResponse.json(updatedLead);
    }, "Error updating lead");
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    return executeDbOperation(async () => {
      const query: {
        _id: mongoose.Types.ObjectId;
        adminId?: mongoose.Types.ObjectId;
      } = {
        _id: new mongoose.Types.ObjectId(id),
      };

      if (session.user.role === "ADMIN") {
        query.adminId = new mongoose.Types.ObjectId(session.user.id);
      } else if (session.user.role === "AGENT" && session.user.adminId) {
        query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
      }

      const deletedLead =
        await Lead.findOneAndDelete(query).lean<LeadDocument>();

      if (!deletedLead) {
        return NextResponse.json(
          { error: "Lead not found or not authorized" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "Lead deleted successfully" });
    }, "Error deleting lead");
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}

// /Users/safeconnection/Downloads/drivecrm/src/app/api/leads/user-leads/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Lead from "@/models/Lead";
import mongoose from "mongoose";

interface LeadDocument {
  _id: mongoose.Types.ObjectId;
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
  leadId?: number;
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const query: { adminId?: mongoose.Types.ObjectId } = {};

    if (session.user.role === "ADMIN") {
      // Admin sees all leads that belong to them
      query.adminId = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.role === "AGENT") {
      // Agent sees only leads assigned to them from their admin
      if (session.user.adminId) {
        query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
      }
    }

    const leads = await Lead.find(query)
      .select(
        "leadId firstName lastName email phone country source status createdAt updatedAt statusChangedAt"
      )
      .sort({ createdAt: -1 })
      .lean<LeadDocument[]>();

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

    return NextResponse.json(transformedLeads);
  } catch (error) {
    console.error("Error fetching user leads:", error);
    return NextResponse.json(
      { message: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

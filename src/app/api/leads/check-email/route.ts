// app/api/leads/check-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/dbConfig";
import Lead from "@/models/Lead";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { getTenantAdminId } from "@/lib/roles";

/**
 * GET /api/leads/check-email?email=xxx
 * Checks if a lead with the given email already exists for the current tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = getTenantAdminId(session.user);
    if (!adminId) {
      return NextResponse.json(
        { error: "Admin scope unresolved" },
        { status: 403 },
      );
    }

    const email = new URL(request.url).searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const existingLead = await Lead.findOne({
      email: email.toLowerCase().trim(),
      adminId: new mongoose.Types.ObjectId(adminId),
    })
      .select("_id email firstName lastName")
      .lean<{
        _id: mongoose.Types.ObjectId;
        email: string;
        firstName: string;
        lastName: string;
      }>();

    if (existingLead) {
      return NextResponse.json(
        {
          exists: true,
          lead: {
            id: existingLead._id.toString(),
            email: existingLead.email,
            name: `${existingLead.firstName} ${existingLead.lastName}`,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 },
    );
  }
}

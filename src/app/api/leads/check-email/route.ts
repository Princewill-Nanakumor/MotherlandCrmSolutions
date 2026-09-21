// app/api/leads/check-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/dbConfig";
import Lead from "@/models/Lead";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

/**
 * GET /api/leads/check-email?email=xxx
 * Checks if a lead with the given email already exists for the current admin
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Build query with multi-tenancy filter
    const query: { email: string; adminId?: mongoose.Types.ObjectId } = {
      email: email.toLowerCase().trim(),
    };

    // Filter by adminId for multi-tenancy
    if (session.user.role === "ADMIN") {
      query.adminId = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
    }

    const existingLead = await Lead.findOne(query)
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
        { status: 200 }
      );
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch (error) {
    console.error("Error checking email:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}

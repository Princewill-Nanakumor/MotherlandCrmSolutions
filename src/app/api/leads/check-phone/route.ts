import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/dbConfig";
import { getTenantAdminId } from "@/lib/roles";
import { findTenantLeadByPhone } from "@/lib/leadPhoneLookup";

/**
 * GET /api/leads/check-phone?phone=xxx
 * Checks if a lead already has this phone (primary or secondary) for the tenant.
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

    const phone = new URL(request.url).searchParams.get("phone");
    if (!phone) {
      return NextResponse.json(
        { error: "Phone parameter is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const existingLead = await findTenantLeadByPhone(adminId, phone);

    if (existingLead) {
      return NextResponse.json(
        {
          exists: true,
          lead: {
            id: existingLead._id.toString(),
            phone: existingLead.phone ?? "",
            name: `${existingLead.firstName} ${existingLead.lastName}`,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ exists: false }, { status: 200 });
  } catch (error) {
    console.error("Error checking phone:", error);
    return NextResponse.json(
      { error: "Failed to check phone" },
      { status: 500 },
    );
  }
}

//src/app/api/users/count/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    await connectMongoDB();

    // Build query based on user role for multi-tenancy
    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    const query: { adminId?: string } = { adminId: adminScopeId };

    const count = await User.countDocuments(query);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error in users/count route:", error);
    return NextResponse.json(
      { error: "Failed to fetch user count" },
      { status: 500 }
    );
  }
}

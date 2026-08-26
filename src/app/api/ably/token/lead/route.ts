import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Ably from "ably";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { getLeadChannelName } from "@/libs/realtime";
import { agentAssignedToUserClause } from "@/lib/leadAssignmentQuery";
import {
  withAdminScope,
  type AdminScopedSession,
} from "@/lib/withAdminScope";
import { canAccessAllLeads } from "@/lib/roles";

interface SessionUser {
  id: string;
  role: string;
  adminId?: string;
  permissions?: string[];
}

interface SessionShape {
  user: SessionUser;
}

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as SessionShape | null;
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const leadId = request.nextUrl.searchParams.get("leadId")?.trim();
    if (!leadId || !mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json({ message: "Invalid leadId" }, { status: 400 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "ABLY_API_KEY is not configured" },
        { status: 500 },
      );
    }

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database unavailable" }, { status: 500 });
    }

    const adminScopeId = await withAdminScope(
      session as AdminScopedSession,
      async (id) => id,
    );
    const adminOid = new ObjectId(adminScopeId);
    const leadOid = new ObjectId(leadId);

    const accessFilter = canAccessAllLeads(session.user)
      ? { _id: leadOid, adminId: adminOid }
      : {
          $and: [
            { _id: leadOid, adminId: adminOid },
            agentAssignedToUserClause(session.user.id),
          ],
        };

    const lead = await db.collection("leads").findOne(accessFilter, {
      projection: { _id: 1 },
    });

    if (!lead) {
      return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    }

    const channelName = getLeadChannelName(adminScopeId, lead._id.toString());
    const client = new Ably.Rest(apiKey);
    const capability = JSON.stringify({
      [channelName]: ["subscribe"],
    });

    const tokenDetails = await client.auth.requestToken({
      clientId: session.user.id,
      capability,
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenDetails);
  } catch (error) {
    console.error("Error creating Ably lead token:", error);
    return NextResponse.json(
      { message: "Failed to create Ably token" },
      { status: 500 },
    );
  }
}

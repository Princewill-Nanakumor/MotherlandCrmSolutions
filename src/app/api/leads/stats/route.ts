import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { canAccessAllLeads, getTenantAdminId } from "@/lib/roles";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    const adminId = await withAdminScope(session, async (adminScopeId) => adminScopeId);

    const adminFilter: Record<string, unknown> = {};
    if (adminId) {
      adminFilter.adminId = new ObjectId(adminId);
    }

    if (canAccessAllLeads(session.user)) {
      const tenantId = getTenantAdminId(session.user);
      if (!tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const tenantObjectId = new ObjectId(tenantId);
      const total = await db.collection("leads").countDocuments(adminFilter);

      // Assigned = leads assigned to this tenant's staff (agents / sub-admins)
      const agentDocs = await db
        .collection("users")
        .find(
          {
            adminId: tenantObjectId,
            _id: { $ne: tenantObjectId },
          },
          { projection: { _id: 1 } },
        )
        .toArray();
      const agentObjectIds = agentDocs.map(
        (d: { _id: { toString: () => string } }) => d._id,
      );

      const assigned =
        agentObjectIds.length === 0
          ? 0
          : await db.collection("leads").countDocuments({
              ...adminFilter,
              $or: [
                { "assignedTo._id": { $in: agentObjectIds } },
                { assignedTo: { $in: agentObjectIds } },
              ],
            });

      const unassigned = total - assigned;

      return NextResponse.json({ total, assigned, unassigned, myLeads: 0 });
    }

    // Assigned-only staff: counts for their own leads
    const userId = session.user.id;
    const userObjectId = new ObjectId(userId);
    const myLeads = await db.collection("leads").countDocuments({
      ...adminFilter,
      $or: [{ "assignedTo._id": userObjectId }, { assignedTo: userObjectId }],
    });

    let total = 0;
    let assigned = 0;
    let unassigned = 0;
    if (adminId) {
      total = await db.collection("leads").countDocuments(adminFilter);
      assigned = await db.collection("leads").countDocuments({
        ...adminFilter,
        assignedTo: { $exists: true, $ne: null },
      });
      unassigned = total - assigned;
    }

    return NextResponse.json({ total, assigned, unassigned, myLeads });
  } catch (error) {
    console.error("Error in /api/leads/stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead stats" },
      { status: 500 },
    );
  }
}

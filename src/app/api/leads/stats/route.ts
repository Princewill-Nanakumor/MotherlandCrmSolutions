import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";

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

    // Prepare filters respecting multi-tenancy
    const adminId = await withAdminScope(session, async (adminScopeId) => adminScopeId);

    const adminFilter: Record<string, unknown> = {};
    if (adminId) {
      adminFilter.adminId = new ObjectId(adminId);
    }

    if (session.user.role === "ADMIN") {
      // Admin: counts across their adminId
      const adminObjectId = new ObjectId(session.user.id);
      const total = await db.collection("leads").countDocuments(adminFilter);

      // Assigned = only leads assigned to this admin's agents (same definition as all-leads filter "my users")
      // Get agent IDs: users created by this admin, excluding the admin themselves
      const agentDocs = await db
        .collection("users")
        .find(
          {
            adminId: adminObjectId,
            _id: { $ne: adminObjectId },
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

      // Unassigned (for admin): all other leads under this admin,
      // including leads assigned to the admin account and truly unassigned leads.
      const unassigned = total - assigned;

      return NextResponse.json({ total, assigned, unassigned, myLeads: 0 });
    }

    // Agent: only counts leads assigned to this agent
    // assignedTo can be stored as ObjectId or as object { _id, firstName, lastName }
    const userId = session.user.id;
    const userObjectId = new ObjectId(userId);
    const myLeads = await db.collection("leads").countDocuments({
      ...adminFilter,
      $or: [{ "assignedTo._id": userObjectId }, { assignedTo: userObjectId }],
    });

    // Also provide overall counts for admin if available (fast counts)
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

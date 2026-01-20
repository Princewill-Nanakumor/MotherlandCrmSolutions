import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Prepare filters respecting multi-tenancy
    const adminId =
      session.user.role === "ADMIN" ? session.user.id : session.user.adminId;

    const adminFilter: Record<string, unknown> = {};
    if (adminId) {
      adminFilter.adminId = new ObjectId(adminId);
    }

    if (session.user.role === "ADMIN") {
      // Admin: counts across their adminId
      const total = await db.collection("leads").countDocuments(adminFilter);
      const assigned = await db.collection("leads").countDocuments({
        ...adminFilter,
        assignedTo: { $exists: true, $ne: null },
      });
      const unassigned = total - assigned;

      return NextResponse.json({ total, assigned, unassigned, myLeads: 0 });
    }

    // Agent: only counts assigned to this agent
    const userId = session.user.id;
    const myLeads = await db.collection("leads").countDocuments({
      ...adminFilter,
      assignedTo: new ObjectId(userId),
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
      { status: 500 }
    );
  }
}

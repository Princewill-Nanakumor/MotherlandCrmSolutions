// src/app/api/status-counts/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;

    // Build query based on user role for multi-tenancy
    const leadsQuery: { adminId?: mongoose.Types.ObjectId } = {};
    const statusesQuery: { adminId?: mongoose.Types.ObjectId } = {};

    if (session.user.role === "ADMIN") {
      // Admin sees only their own data
      const adminObjectId = new mongoose.Types.ObjectId(session.user.id);
      leadsQuery.adminId = adminObjectId;
      statusesQuery.adminId = adminObjectId;
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      // Agent sees data from their admin
      const adminObjectId = new mongoose.Types.ObjectId(session.user.adminId);
      leadsQuery.adminId = adminObjectId;
      statusesQuery.adminId = adminObjectId;
    }

    // Get all statuses for this admin
    const statuses = await db
      .collection("statuses")
      .find(statusesQuery)
      .toArray();

    // Get total leads count for this admin
    const allLeadsCount = await db
      .collection("leads")
      .countDocuments(leadsQuery);

    // Check if status is stored as ObjectId or string
    const sampleLead = await db.collection("leads").findOne(leadsQuery);
    const isObjectId =
      sampleLead &&
      sampleLead.status &&
      mongoose.isValidObjectId(sampleLead.status);

    let statusCounts: {
      id: string;
      name: string;
      color: string;
      count: number;
      isDeleted: boolean;
    }[] = [];

    if (isObjectId) {
      // If status is ObjectId, use $lookup to get status name with multi-tenancy
      const results = await db
        .collection("leads")
        .aggregate([
          {
            $match: leadsQuery, // Multi-tenancy filter
          },
          {
            $lookup: {
              from: "statuses",
              localField: "status",
              foreignField: "_id",
              as: "statusObj",
            },
          },
          { $unwind: { path: "$statusObj", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: "$statusObj.name",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      statusCounts = statuses.map((status) => {
        const found = results.find(
          (item) =>
            typeof item._id === "string" &&
            item._id.localeCompare(status.name, undefined, {
              sensitivity: "accent",
            }) === 0
        );
        return {
          id: status.name,
          name: status.name,
          color: status.color,
          count: found ? found.count : 0,
          isDeleted: false,
        };
      });
    } else {
      // If status is string, do a case-insensitive count for each status with multi-tenancy
      statusCounts = await Promise.all(
        statuses.map(async (status) => {
          const count = await db.collection("leads").countDocuments({
            ...leadsQuery, // Multi-tenancy filter
            status: { $regex: new RegExp(`^${status.name}$`, "i") },
          });
          return {
            id: status.name,
            name: status.name,
            color: status.color,
            count,
            isDeleted: false,
          };
        })
      );
    }

    // Add "All Leads" as the first item
    statusCounts.unshift({
      id: "ALL",
      name: "All Leads",
      color: "#2D6F8B", // You can pick any color you want for "All Leads"
      count: allLeadsCount,
      isDeleted: false,
    });

    // Totals
    const totalStatuses = statuses.length;
    const totalLeads = allLeadsCount;

    return NextResponse.json({
      statusCounts,
      totalStatuses,
      totalLeads,
    });
  } catch (error) {
    console.error("Error in status-counts route:", error);
    return NextResponse.json(
      { error: "Failed to fetch status counts" },
      { status: 500 }
    );
  }
}

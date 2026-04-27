// src/app/api/leads/count/route.ts
import { NextResponse } from "next/server";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { agentLeadsInTenantFilter } from "@/lib/leadAssignmentQuery";

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

    let query: Record<string, unknown> = {};

    if (session.user.role === "ADMIN") {
      query.adminId = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.role === "AGENT") {
      if (!session.user.adminId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      query = agentLeadsInTenantFilter(
        new mongoose.Types.ObjectId(session.user.adminId),
        session.user.id,
      );
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const count = await mongoose.connection.db
      .collection("leads")
      .countDocuments(query);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error in leads/count route:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads count" },
      { status: 500 }
    );
  }
}

// drivecrm/src/app/api/leads/import/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/dbConfig";
import mongoose from "mongoose";

function extractIdFromUrl(urlString: string): string {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  return parts[parts.length - 1];
}

export async function DELETE(request: Request) {
  try {
    const id = extractIdFromUrl(request.url);

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 });
    }

    // Build query with multi-tenancy filter
    const query: {
      _id: mongoose.Types.ObjectId;
      adminId?: mongoose.Types.ObjectId;
    } = {
      _id: new mongoose.Types.ObjectId(id),
    };

    // Add adminId filter for multi-tenancy
    if (session.user.role === "ADMIN") {
      // Admin can only delete leads they created
      query.adminId = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      // Agent can only delete leads from their admin
      query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
    }

    // Delete lead by id with multi-tenancy check
    const result = await mongoose.connection.db
      .collection("leads")
      .deleteOne(query);

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      {
        error: "Failed to delete lead",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// app/api/statuses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Status from "@/models/Status";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";

// Helper to retry DB operation if connection fails
async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      await connectMongoDB();
      return await operation();
    } catch (err) {
      lastError = err;
      if (i === retries) throw err;
      // Wait a bit before retrying
      await new Promise((res) => setTimeout(res, 500 * (i + 1)));
    }
  }
  throw lastError;
}

// PUT /api/statuses/[id]
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN users can update statuses
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can update statuses" },
        { status: 403 }
      );
    }

    // Extract status ID from URL
    const segments = req.url.split("/");
    const id = segments[segments.length - 1];

    if (id === "NEW") {
      return NextResponse.json(
        { error: "Default NEW status cannot be edited" },
        { status: 403 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid status ID" }, { status: 400 });
    }

    const { name, color } = await req.json();
    if (!name || !color) {
      return NextResponse.json(
        { message: "Name and color are required" },
        { status: 400 }
      );
    }

    // Build query for multi-tenancy
    const query: {
      _id: mongoose.Types.ObjectId;
      adminId: mongoose.Types.ObjectId;
    } = {
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(session.user.id),
    };

    const existingStatus = await withDbRetry(() => Status.findOne(query));
    if (!existingStatus) {
      return NextResponse.json(
        { error: "Status not found or not authorized" },
        { status: 404 }
      );
    }

    if ((existingStatus.name || "").trim().toUpperCase() === "NEW") {
      return NextResponse.json(
        { error: "Default NEW status cannot be edited" },
        { status: 403 }
      );
    }

    const updatedStatus = await withDbRetry(() =>
      Status.findOneAndUpdate(
        query,
        { name, color, updatedAt: new Date() },
        { new: true }
      )
    );

    if (!updatedStatus) {
      return NextResponse.json(
        { error: "Status not found or not authorized" },
        { status: 404 }
      );
    }

    // FIXED: Return the same structure as the main route (both _id and id)
    const transformedStatus = {
      _id: updatedStatus._id.toString(), // Keep _id for display compatibility
      id: updatedStatus._id.toString(), // Add id for filtering compatibility
      name: updatedStatus.name,
      color: updatedStatus.color,
      adminId: updatedStatus.adminId.toString(),
      createdBy: updatedStatus.createdBy.toString(),
      createdAt: updatedStatus.createdAt,
      updatedAt: updatedStatus.updatedAt,
    };

    return NextResponse.json(transformedStatus);
  } catch (error) {
    console.error("Error updating status:", error);
    return NextResponse.json(
      { message: "Failed to update status" },
      { status: 500 }
    );
  }
}

// DELETE /api/statuses/[id]
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN users can delete statuses
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can delete statuses" },
        { status: 403 }
      );
    }

    // Extract status ID from URL
    const segments = req.url.split("/");
    const id = segments[segments.length - 1];

    if (id === "NEW") {
      return NextResponse.json(
        { error: "Default NEW status cannot be deleted" },
        { status: 403 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid status ID" }, { status: 400 });
    }

    // Build query for multi-tenancy
    const query: {
      _id: mongoose.Types.ObjectId;
      adminId: mongoose.Types.ObjectId;
    } = {
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(session.user.id),
    };

    const existingStatus = await withDbRetry(() => Status.findOne(query));
    if (!existingStatus) {
      return NextResponse.json(
        { error: "Status not found or not authorized" },
        { status: 404 }
      );
    }

    if ((existingStatus.name || "").trim().toUpperCase() === "NEW") {
      return NextResponse.json(
        { error: "Default NEW status cannot be deleted" },
        { status: 403 }
      );
    }

    const deletedStatus = await withDbRetry(() => Status.findOneAndDelete(query));

    if (!deletedStatus) {
      return NextResponse.json(
        { error: "Status not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("Error deleting status:", error);
    return NextResponse.json(
      { message: "Failed to delete status" },
      { status: 500 }
    );
  }
}

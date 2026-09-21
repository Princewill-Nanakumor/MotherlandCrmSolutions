// /Users/safeconnection/Downloads/drivecrm/src/app/api/imports/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/dbConfig";
import Import from "@/models/Import";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

// Define query type for MongoDB filters
interface ImportQuery {
  _id: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
}

export async function PATCH(request: NextRequest) {
  try {
    // Extract the id from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1];

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    await connectMongoDB();

    // Build query with multi-tenancy filter
    const query: ImportQuery = { _id: new mongoose.Types.ObjectId(id) };

    if (session.user.role === "ADMIN") {
      // Admin can only update imports they created
      query.adminId = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      // Agent can only update imports from their admin
      query.adminId = new mongoose.Types.ObjectId(session.user.adminId);
    }

    const updatedImport = await Import.findOneAndUpdate(
      query,
      { ...data, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedImport) {
      return NextResponse.json(
        { message: "Import not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedImport);
  } catch (error) {
    console.error("Error updating import:", error);
    return NextResponse.json(
      { message: "Error updating import" },
      { status: 500 }
    );
  }
}

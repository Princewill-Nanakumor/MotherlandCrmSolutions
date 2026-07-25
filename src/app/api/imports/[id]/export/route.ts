import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import mongoose from "mongoose";
import {
  buildCsvDownloadResponse,
  fetchLeadsForImportExport,
} from "@/lib/importExportServer";

/** Export leads from a specific import batch as import-compatible CSV. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }
    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only administrators can export imports");
    }

    const { id: importId } = await params;
    if (!importId || !mongoose.Types.ObjectId.isValid(importId)) {
      return NextResponse.json({ error: "Invalid import id" }, { status: 400 });
    }

    await connectMongoDB();

    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    if (!adminScopeId) {
      return NextResponse.json(
        { error: "Admin scope not found for session user" },
        { status: 400 },
      );
    }

    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);
    const importObjectId = new mongoose.Types.ObjectId(importId);

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    const importRecord = await db.collection("imports").findOne({
      _id: importObjectId,
      adminId: adminObjectId,
    });

    if (!importRecord) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    const leads = await fetchLeadsForImportExport(adminObjectId, importId);

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No leads found for this import." },
        { status: 404 },
      );
    }

    const rawName =
      typeof importRecord.fileName === "string"
        ? importRecord.fileName.replace(/\.[^.]+$/, "")
        : "import";
    const filename = `${rawName}-export.csv`;

    return buildCsvDownloadResponse(leads, filename);
  } catch (error) {
    console.error("Error exporting import:", error);
    return NextResponse.json(
      { error: "Failed to export import" },
      { status: 500 },
    );
  }
}

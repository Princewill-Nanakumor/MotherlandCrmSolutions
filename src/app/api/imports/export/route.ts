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

/** Export all leads for the current tenant as import-compatible CSV. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }
    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only administrators can export leads");
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
    const leads = await fetchLeadsForImportExport(adminObjectId);

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No leads to export. Import or add leads first." },
        { status: 404 },
      );
    }

    const date = new Date().toISOString().split("T")[0];
    return buildCsvDownloadResponse(leads, `leads-export-${date}.csv`);
  } catch (error) {
    console.error("Error exporting leads:", error);
    return NextResponse.json(
      { error: "Failed to export leads" },
      { status: 500 },
    );
  }
}

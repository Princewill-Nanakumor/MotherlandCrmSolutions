// src/app/api/imports/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { executeDbOperation } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { canCreateLead } from "@/lib/roles";
import { checkTenantLeadImportAllowed } from "@/lib/tenantLeadImportLimits";
import {
  MAX_LEADS_PER_IMPORT,
  getPerImportLimitError,
} from "@/lib/importBatchLimits";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";

// Define query types for MongoDB filters
interface ImportQuery {
  uploadedBy?: mongoose.Types.ObjectId;
  _id?: mongoose.Types.ObjectId;
}

interface LeadsQuery {
  $or: Array<{ importId: string | mongoose.Types.ObjectId }>;
  adminId?: mongoose.Types.ObjectId;
}

export async function GET() {
  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    // Build query based on user role for multi-tenancy
    const query: ImportQuery = {};

    if (session.user.role === "ADMIN") {
      // Admin sees only imports they created
      query.uploadedBy = new mongoose.Types.ObjectId(session.user.id);
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      // Agent sees imports from their admin
      query.uploadedBy = new mongoose.Types.ObjectId(session.user.adminId);
    }

    const imports = await mongoose.connection.db
      .collection("imports")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ imports });
  }, "Failed to fetch imports");
}

export async function POST(request: Request) {
  let requestData: {
    fileName: string;
    recordCount: number;
    status?: string;
    successCount?: number;
    failureCount?: number;
    timestamp?: number;
  };

  try {
    requestData = await request.json();
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }
    if (!canCreateLead(session.user)) {
      return forbiddenResponse("Only administrators can import leads");
    }

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    // Check usage limits before allowing import
    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    if (!adminScopeId) {
      return NextResponse.json(
        { error: "Admin scope not found for session user" },
        { status: 400 },
      );
    }
    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);

    const batchLimitError = getPerImportLimitError(requestData.recordCount);
    if (batchLimitError) {
      return NextResponse.json(
        {
          error: batchLimitError,
          message: batchLimitError,
          maxPerImport: MAX_LEADS_PER_IMPORT,
          attempted: requestData.recordCount,
        },
        { status: 400 },
      );
    }

    const limitCheck = await checkTenantLeadImportAllowed(
      mongoose.connection.db,
      {
        adminObjectId,
        newLeadCount: requestData.recordCount,
      },
    );
    if (!limitCheck.ok) {
      return NextResponse.json(limitCheck.body, { status: limitCheck.status });
    }
    const { currentLeads, maxLeads } = limitCheck;

    const importData = {
      fileName: requestData.fileName,
      recordCount: requestData.recordCount,
      status: "staging",
      successCount: 0,
      failureCount: 0,
      processedCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 0,
      mode: "queued",
      timestamp: requestData.timestamp || Date.now(),
      uploadedBy: new mongoose.Types.ObjectId(session.user.id),
      adminId: adminObjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const importRecord = await mongoose.connection.db
        .collection("imports")
        .insertOne(importData);

      const createdImport = await mongoose.connection.db
        .collection("imports")
        .findOne({ _id: importRecord.insertedId });

      const response = {
        data: {
          _id: createdImport!._id.toString(),
          ...createdImport,
        },
        message: "Import job accepted",
        accepted: true,
        usage: {
          currentLeads: currentLeads + requestData.recordCount,
          maxLeads,
          remainingLeads:
            maxLeads === -1
              ? -1
              : Math.max(
                  0,
                  maxLeads - (currentLeads + requestData.recordCount),
                ),
        },
      };

      // 202 Accepted — client stages chunks, then worker drains via /api/imports/run
      return NextResponse.json(response, { status: 202 });
    } catch (dbError) {
      console.error("Database error during import creation:", dbError);
      throw dbError;
    }
  }, "Failed to create import");
}

export async function DELETE(request: Request) {
  return executeDbOperation(async () => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      // Delete single import and its leads with multi-tenancy filter
      const query: ImportQuery = { _id: new mongoose.Types.ObjectId(id) };

      if (session.user.role === "ADMIN") {
        // Admin can only delete imports they created
        query.uploadedBy = new mongoose.Types.ObjectId(session.user.id);
      } else if (session.user.role === "AGENT" && session.user.adminId) {
        // Agent can only delete imports from their admin
        query.uploadedBy = new mongoose.Types.ObjectId(session.user.adminId);
      }

      const importRecord = await mongoose.connection.db
        .collection("imports")
        .findOne(query);

      if (!importRecord) {
        return NextResponse.json(
          { error: "Import not found" },
          { status: 404 }
        );
      }

      // Delete leads with multi-tenancy filter
      const leadsQuery: LeadsQuery = {
        $or: [{ importId: id }, { importId: new mongoose.Types.ObjectId(id) }],
      };

      // Add adminId filter for multi-tenancy
      if (session.user.role === "ADMIN") {
        leadsQuery.adminId = new mongoose.Types.ObjectId(session.user.id);
      } else if (session.user.role === "AGENT" && session.user.adminId) {
        leadsQuery.adminId = new mongoose.Types.ObjectId(session.user.adminId);
      }

      const deleteLeadsResult = await mongoose.connection.db
        .collection("leads")
        .deleteMany(leadsQuery);

      await mongoose.connection.db.collection("imports").deleteOne(query);

      const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
      if (adminScopeId) {
        try {
          await publishAdminLeadsUpdatedEvent(adminScopeId, {
            type: "import_deleted",
            importId: id,
            deletedLeads: deleteLeadsResult.deletedCount,
            actorId: session.user.id,
          });
        } catch (publishError) {
          console.error(
            "Ably publish failed after deleting import leads:",
            publishError,
          );
        }
      }

      return NextResponse.json({
        message: "Import and associated leads deleted",
        deletedLeads: deleteLeadsResult.deletedCount,
      });
    } else {
      // Delete all imports and leads for the current admin only
      const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
      if (!adminScopeId) {
        return NextResponse.json(
          { error: "Admin scope not found for session user" },
          { status: 400 },
        );
      }
      const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);

      // Delete leads for this admin only
      const deleteLeadsResult = await mongoose.connection.db
        .collection("leads")
        .deleteMany({ adminId: adminObjectId });

      // Delete imports for this admin only
      const deleteImportsResult = await mongoose.connection.db
        .collection("imports")
        .deleteMany({ adminId: adminObjectId });

      if (
        deleteLeadsResult.deletedCount > 0 ||
        deleteImportsResult.deletedCount > 0
      ) {
        try {
          await publishAdminLeadsUpdatedEvent(adminScopeId, {
            type: "imports_cleared",
            deletedLeads: deleteLeadsResult.deletedCount,
            deletedImports: deleteImportsResult.deletedCount,
            actorId: session.user.id,
          });
        } catch (publishError) {
          console.error(
            "Ably publish failed after clearing import leads:",
            publishError,
          );
        }
      }

      return NextResponse.json({
        message: "All imports and leads deleted for this admin",
        deletedLeads: deleteLeadsResult.deletedCount,
        deletedImports: deleteImportsResult.deletedCount,
      });
    }
  }, "Failed to delete imports");
}

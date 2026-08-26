// /src/app/api/leads/import/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import { checkTenantLeadImportAllowed } from "@/lib/tenantLeadImportLimits";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import { canCreateLead } from "@/lib/roles";

// Define interface for imported lead data
interface ImportedLead {
  name?: string;
  email: string;
  phone?: string;
  source?: string;
}

// Define interface for transformed lead data
interface TransformedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId; // Multi-tenancy
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: Request) {
  const req = request as unknown as import("next/server").NextRequest;
  try {
    if (!rateLimitEnhanced(req, 15, 60000)) {
      return NextResponse.json(
        { error: "Too many import requests. Please try again shortly." },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }
    if (!canCreateLead(session.user)) {
      return forbiddenResponse("Only administrators can import leads");
    }

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const db = mongoose.connection.db;

    const leads = (await request.json()) as ImportedLead[];

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "Invalid data format or empty array" },
        { status: 400 }
      );
    }

    const adminScopeId = await withAdminScope(session, async (adminId) => adminId);
    const adminObjectId = new mongoose.Types.ObjectId(adminScopeId);
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    const limitCheck = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: leads.length,
    });
    if (!limitCheck.ok) {
      return NextResponse.json(limitCheck.body, { status: limitCheck.status });
    }

    // Transform leads to match your schema with multi-tenancy
    const transformedLeads: TransformedLead[] = leads.map(
      (lead: ImportedLead) => {
        const [firstName, ...rest] = (lead.name || "").split(" ");
        return {
          firstName: firstName || "",
          lastName: rest.join(" ") || "",
          email: lead.email.trim().toLowerCase(),
          phone: lead.phone || "",
          source: lead.source && lead.source !== "-" && lead.source.trim() !== "" ? lead.source : "—",
          status: "NEW",
          createdBy: userObjectId,
          adminId: adminObjectId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
    );

    // All-or-nothing import transaction with deterministic dedupe behavior
    const mongoSession = await mongoose.startSession();
    let insertedCount = 0;
    try {
      await mongoSession.withTransaction(async () => {
        const operations = transformedLeads.map((lead) => ({
          updateOne: {
            filter: { email: lead.email, adminId: lead.adminId },
            update: { $setOnInsert: lead },
            upsert: true,
          },
        }));

        const result = await db.collection("leads").bulkWrite(operations, {
          ordered: true,
          session: mongoSession,
        });
        insertedCount = result.upsertedCount ?? 0;
      });
    } finally {
      await mongoSession.endSession();
    }

    if (insertedCount > 0 && adminScopeId) {
      try {
        await publishAdminLeadsUpdatedEvent(adminScopeId, {
          type: "legacy_import_completed",
          inserted: insertedCount,
          actorId: session.user.id,
        });
      } catch (publishError) {
        console.error("Ably publish failed after legacy lead import:", publishError);
      }
    }

    return NextResponse.json({
      message: `Successfully imported ${insertedCount} leads`,
      totalProcessed: leads.length,
      successCount: insertedCount,
      skippedDuplicates: Math.max(0, leads.length - insertedCount),
    });
  } catch (error) {
    console.error("Error in lead import:", error);
    return NextResponse.json(
      {
        error: "Failed to import leads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Activity from "@/models/Activity";
import Lead from "@/models/Lead";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { singleLeadAccessFilter } from "@/lib/leadAssignmentQuery";
import { canAccessAllLeads, getTenantAdminId } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";
import {
  sessionPerfMark,
  withSessionPerf,
} from "@/lib/sessionPerfProbe";
import { withMongoPerf } from "@/lib/mongoPerfProbe";

// Bounded LRU-ish cache for status name resolution. Module-level caches in
// serverless environments otherwise grow unbounded across invocations.
const STATUS_CACHE_MAX = 500;
const statusCache = new Map<string, string>();
function setStatusCache(key: string, value: string) {
  if (statusCache.size >= STATUS_CACHE_MAX) {
    const firstKey = statusCache.keys().next().value;
    if (firstKey) statusCache.delete(firstKey);
  }
  statusCache.set(key, value);
}

// Helper function to resolve status names
async function resolveStatusNames(
  statusIds: Set<string>
): Promise<Record<string, string>> {
  const statusNames: Record<string, string> = {};
  const uncachedIds: string[] = [];

  // Always resolve "new" to "New"
  if (statusIds.has("new")) {
    statusNames["new"] = "New";
    statusIds.delete("new");
  }

  // Check cache first
  for (const statusId of statusIds) {
    const cached = statusCache.get(statusId);
    if (cached) {
      statusNames[statusId] = cached;
    } else {
      uncachedIds.push(statusId);
    }
  }

  // Fetch uncached status names from DB as before...
  if (uncachedIds.length > 0) {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const statusCollection = db.collection("status");
        const statusDocs = await statusCollection
          .find({
            _id: {
              $in: uncachedIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          })
          .toArray();

        statusDocs.forEach((status) => {
          const statusId = status._id.toString();
          const statusName = status.name;
          statusNames[statusId] = statusName;
          setStatusCache(statusId, statusName);
        });
      }
    } catch (error) {
      console.error("Error fetching status names:", error);
    }
  }

  return statusNames;
}

// Type for activity document from lean query
interface ActivityDocument {
  _id: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  type: string;
  details: string;
  timestamp: Date;
  updatedAt: Date;
  adminId?: mongoose.Types.ObjectId; // Multi-tenancy
  userId?:
    | {
        _id: mongoose.Types.ObjectId;
        firstName: string;
        lastName: string;
      }
    | mongoose.Types.ObjectId;
  metadata?: {
    oldStatusId?: string;
    newStatusId?: string;
    oldStatus?: string;
    newStatus?: string;
    performedBy?: { id?: string; firstName?: string; lastName?: string };
    assignedBy?: {
      id?: string;
      _id?: string | mongoose.Types.ObjectId;
      firstName?: string;
      lastName?: string;
    };
    [key: string]: unknown;
  };
}

function actorFromMetadata(
  meta:
    | {
        id?: string;
        _id?: string | mongoose.Types.ObjectId;
        firstName?: string;
        lastName?: string;
      }
    | undefined,
): { _id: string; firstName: string; lastName: string } | null {
  if (!meta?.firstName && !meta?.lastName) return null;
  const id =
    meta.id ??
    (meta._id != null ? String(meta._id) : undefined) ??
    "unknown";
  return {
    _id: id,
    firstName: meta.firstName || "Unknown",
    lastName: meta.lastName || "",
  };
}

export async function GET(request: NextRequest) {
  const wallStart = Date.now();
  const [response] = await withMongoPerf(async () => {
    const perf = new ApiRoutePerf("GET /api/leads/[id]/activities");
    try {
      const [session, sessionProbe] = await withSessionPerf(async () => {
        sessionPerfMark("getServerSessionEnter");
        const s = await getServerSession(authOptions);
        sessionPerfMark("getServerSessionExit");
        return s;
      });
      perf.mark("getServerSession");
      if (!session?.user) return unauthorizedResponse();

      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const leadId = pathParts[pathParts.length - 2];

      if (!mongoose.Types.ObjectId.isValid(leadId)) {
        perf.finish({ status: 400 });
        return NextResponse.json({ message: "Invalid lead id" }, { status: 400 });
      }

      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get("limit") || "20")),
      );
      const skip = (page - 1) * limit;

      await connectMongoDB();
      perf.mark("connectMongoDB");
      const tenantId = getTenantAdminId(session.user);
      if (!tenantId) {
        perf.finish({ status: 403 });
        return forbiddenResponse("Admin scope unresolved");
      }
      const adminId = new mongoose.Types.ObjectId(tenantId);

      const leadObjectId = new mongoose.Types.ObjectId(leadId);

      const lead = await Lead.findOne(
        singleLeadAccessFilter(
          leadObjectId,
          adminId,
          session.user.role,
          session.user.id,
          canAccessAllLeads(session.user),
        ),
      )
        .select({ _id: 1 })
        .lean();
      perf.mark("leadAccessCheck");
      if (!lead) {
        perf.finish({ status: 404 });
        return NextResponse.json(
          { message: "Lead not found or not authorized" },
          { status: 404 },
        );
      }

      const query: Record<string, unknown> = {
        leadId: leadObjectId,
        type: { $nin: ["COMMENT", null] },
        $or: [
          { adminId },
          { adminId: { $exists: false } },
          { adminId: null },
        ],
      };

      const activities = await Activity.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      perf.mark("fetchActivities");

    // Collect status IDs for resolution
    const statusIds = new Set<string>();
    activities.forEach((activity: unknown) => {
      const act = activity as ActivityDocument;
      if (
        act.metadata?.oldStatusId &&
        mongoose.Types.ObjectId.isValid(act.metadata.oldStatusId)
      ) {
        statusIds.add(act.metadata.oldStatusId);
      }
      if (
        act.metadata?.newStatusId &&
        mongoose.Types.ObjectId.isValid(act.metadata.newStatusId)
      ) {
        statusIds.add(act.metadata.newStatusId);
      }
    });

    // Resolve status names
    const statusNames = await resolveStatusNames(statusIds);
    perf.mark("resolveStatusNames");

    // Transform activities
    const transformedActivities = activities.map((activity: unknown) => {
      const act = activity as ActivityDocument;

      // Handle populated userId (user may be deleted - populate returns null; use metadata fallbacks)
      let createdBy = {
        _id: "unknown",
        firstName: "Unknown",
        lastName: "User",
      };

      if (act.userId) {
        if (Array.isArray(act.userId)) {
          createdBy = act.userId[0] || createdBy;
        } else if (typeof act.userId === "object" && act.userId !== null) {
          // Check if it's a populated user object
          if ("firstName" in act.userId && "lastName" in act.userId) {
            createdBy = {
              _id: act.userId._id?.toString() || "unknown",
              firstName: act.userId.firstName || "Unknown",
              lastName: act.userId.lastName || "User",
            };
          } else {
            // It's just an ObjectId (populate failed)
            createdBy = {
              _id: act.userId.toString(),
              firstName: "Unknown",
              lastName: "User",
            };
          }
        }
      }

      // Fallback: deleted user / populate miss — use denormalized actor metadata
      // (STATUS_CHANGE uses performedBy; ASSIGNMENT uses assignedBy).
      if (createdBy.firstName === "Unknown" && createdBy.lastName === "User") {
        const fromMeta =
          actorFromMetadata(act.metadata?.performedBy) ||
          actorFromMetadata(act.metadata?.assignedBy);
        if (fromMeta) createdBy = fromMeta;
      }

      // Resolve status names
      const oldStatus =
        act.metadata?.oldStatusId && statusNames[act.metadata.oldStatusId]
          ? statusNames[act.metadata.oldStatusId]
          : act.metadata?.oldStatus || "Unknown";

      const newStatus =
        act.metadata?.newStatusId && statusNames[act.metadata.newStatusId]
          ? statusNames[act.metadata.newStatusId]
          : act.metadata?.newStatus || "Unknown";

      return {
        _id: act._id.toString(),
        leadId: act.leadId?.toString(),
        type: act.type,
        description: act.details,
        createdBy,
        createdAt: act.timestamp,
        updatedAt: act.updatedAt,
        metadata: {
          ...act.metadata,
          oldStatus,
          newStatus,
        },
      };
    });

    return apiPerfJsonResponse(perf, transformedActivities, {
      sessionProbe,
      wallMs: Date.now() - wallStart,
      extra: { count: transformedActivities.length },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", typeof error);
      console.error("Error value:", error);
    }
    perf.finish({ error: true, wallMs: Date.now() - wallStart });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
  });
  return response;
}

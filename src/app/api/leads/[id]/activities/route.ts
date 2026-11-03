import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/dbConfig";
import Activity from "@/models/Activity";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { findAccessibleLead } from "@/lib/leadAssignmentQuery";
import { canAccessAllLeads, getTenantAdminId } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";
import {
  sessionPerfMark,
  withSessionPerf,
} from "@/lib/sessionPerfProbe";
import { withMongoPerf } from "@/lib/mongoPerfProbe";
import { resolveActivityCreatedBy } from "@/lib/activityActor";

/** One-shot per warm instance — schema autoIndex is off in production. */
let activityPanelIndexEnsured = false;
async function ensureActivityPanelIndex(): Promise<void> {
  if (activityPanelIndexEnsured) return;
  activityPanelIndexEnsured = true;
  try {
    await Activity.collection.createIndex(
      { leadId: 1, adminId: 1, timestamp: -1 },
      { background: true, name: "leadId_1_adminId_1_timestamp_-1" },
    );
  } catch {
    /* index may already exist under another name */
  }
}

const ACTIVITY_PANEL_SELECT =
  "_id leadId type details timestamp updatedAt adminId userId metadata";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

      const { id: leadId } = await params;
      const url = new URL(request.url);

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
      void ensureActivityPanelIndex();
      const tenantId = getTenantAdminId(session.user);
      if (!tenantId) {
        perf.finish({ status: 403 });
        return forbiddenResponse("Admin scope unresolved");
      }
      const adminId = new mongoose.Types.ObjectId(tenantId);

      const leadObjectId = new mongoose.Types.ObjectId(leadId);

      const lead = await findAccessibleLead(
        leadObjectId,
        adminId,
        session.user.role,
        session.user.id,
        canAccessAllLeads(session.user),
      );
      perf.mark("leadAccessCheck");
      if (!lead) {
        perf.finish({ status: 404 });
        return NextResponse.json(
          { message: "Lead not found or not authorized" },
          { status: 404 },
        );
      }

      // Prefer the tenant-scoped index { leadId, adminId, timestamp }.
      // Legacy rows without adminId are rare; include them in a cheap $or only
      // when the primary query returns fewer than `limit` rows (below).
      const baseFilter = {
        leadId: leadObjectId,
        type: { $nin: ["COMMENT", null] },
      };

      let activities = await Activity.find({
        ...baseFilter,
        adminId,
      })
        .select(ACTIVITY_PANEL_SELECT)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      if (activities.length < limit && skip === 0) {
        const legacy = await Activity.find({
          ...baseFilter,
          $or: [{ adminId: { $exists: false } }, { adminId: null }],
        })
          .select(ACTIVITY_PANEL_SELECT)
          .sort({ timestamp: -1 })
          .limit(limit - activities.length)
          .lean();
        if (legacy.length) {
          const seen = new Set(activities.map((a) => String(a._id)));
          for (const row of legacy) {
            const id = String(row._id);
            if (seen.has(id)) continue;
            activities.push(row);
            seen.add(id);
          }
          activities.sort(
            (a, b) =>
              new Date(b.timestamp as Date).getTime() -
              new Date(a.timestamp as Date).getTime(),
          );
          if (activities.length > limit) {
            activities = activities.slice(0, limit);
          }
        }
      }
      perf.mark("fetchActivities");

      const statusIds = new Set<string>();
      for (const activity of activities) {
        const act = activity as unknown as ActivityDocument;
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
      }

      const statusNames = await resolveStatusNames(statusIds);
      perf.mark("resolveStatusNames");

      const transformedActivities = activities.map((activity) => {
        const act = activity as unknown as ActivityDocument;
        const createdBy = resolveActivityCreatedBy({
          userId: Array.isArray(act.userId) ? act.userId[0] : act.userId,
          metadata: act.metadata,
        });
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
        { status: 500 },
      );
    }
  });
  return response;
}

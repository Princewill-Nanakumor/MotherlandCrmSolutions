import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Activity from "@/models/Activity";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";

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

// Define session user interface
interface SessionUser {
  id: string;
  role: "ADMIN" | "AGENT";
  adminId?: string;
  firstName?: string;
  lastName?: string;
}

// Define session interface
interface Session {
  user: SessionUser;
}

function getCorrectAdminId(session: Session): mongoose.Types.ObjectId | null {
  if (session.user.role === "ADMIN") {
    return new mongoose.Types.ObjectId(session.user.id);
  }
  if (session.user.role === "AGENT" && session.user.adminId) {
    return new mongoose.Types.ObjectId(session.user.adminId);
  }
  return null;
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
    [key: string]: unknown;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session) return unauthorizedResponse();

    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const leadId = pathParts[pathParts.length - 2];

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return NextResponse.json({ message: "Invalid lead id" }, { status: 400 });
    }

    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20")),
    );
    const skip = (page - 1) * limit;

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);
    if (!adminId) return forbiddenResponse("Admin scope unresolved");

    // Force User model registration so populate() resolves correctly.
    if (!mongoose.models.User) {
      void User;
    }

    const leadObjectId = new mongoose.Types.ObjectId(leadId);

    // Verify the lead is in the caller's tenant before returning any
    // activities, otherwise legacy activities (no adminId) could leak.
    const lead = await Lead.findOne({ _id: leadObjectId, adminId })
      .select({ _id: 1 })
      .lean();
    if (!lead) {
      return NextResponse.json(
        { message: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    // Exclude COMMENT activities — comments are shown directly in the comments
    // pane. We also exclude null types to avoid false negatives from $ne.
    const query: Record<string, unknown> = {
      leadId: leadObjectId,
      type: { $nin: ["COMMENT", null] },
      $or: [
        { adminId },
        { adminId: { $exists: false } },
        { adminId: null },
      ],
    };

    // Find activities with proper population and multi-tenancy filter
    const activities = await Activity.find(query)
      .populate("userId", "firstName lastName")
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

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

    // Transform activities
    const transformedActivities = activities.map((activity: unknown) => {
      const act = activity as ActivityDocument;

      // Handle populated userId (user may be deleted - populate returns null; use metadata.performedBy as fallback)
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

      // Fallback: user was deleted, use denormalized performedBy from metadata (e.g. STATUS_CHANGE)
      const performedBy = act.metadata?.performedBy as
        | { id?: string; firstName?: string; lastName?: string }
        | undefined;
      if (
        (createdBy.firstName === "Unknown" && createdBy.lastName === "User") &&
        performedBy?.firstName &&
        performedBy?.lastName
      ) {
        createdBy = {
          _id: performedBy.id ?? "unknown",
          firstName: performedBy.firstName,
          lastName: performedBy.lastName,
        };
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

    return NextResponse.json(transformedActivities);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error type:", typeof error);
      console.error("Error value:", error);
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

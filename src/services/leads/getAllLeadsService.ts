import { NextRequest } from "next/server";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { Db, ObjectId } from "mongodb";
import {
  buildTenantLeadBaseQuery,
  buildLeadSearchConditions,
  parseLeadListPagination,
} from "@/lib/leadListQuery";
import { maskEmail, maskPhone } from "@/lib/contactMasking";
import { getAgentContactVisibilityFromDb } from "@/lib/getAgentContactVisibilityFromDb";
import {
  expandCountryFilterValues,
  normalizeCountryInput,
} from "@/lib/countryNormalize";
import { canAccessAllLeads, getTenantAdminId, isTenantStaff } from "@/lib/roles";
import type { ApiRoutePerf } from "@/lib/apiRoutePerf";

interface SessionUser {
  id: string;
  role: string;
  adminId?: string;
  permissions?: string[];
  /** Required for agent PII flags to match GET /api/users/me (same as JWT email). */
  email?: string | null;
}

interface UserData {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeadFilter = Record<string, any>;

const totalAllCache = new Map<string, { count: number; ts: number }>();
const TOTAL_ALL_CACHE_TTL_MS = 60_000;

const LEADS_LIST_PROJECTION = {
  _id: 1,
  leadId: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
  phone: 1,
  source: 1,
  status: 1,
  country: 1,
  assignedTo: 1,
  createdAt: 1,
  updatedAt: 1,
  statusChangedAt: 1,
  lastActivityAt: 1,
  comments: 1,
} as const;

function getCachedTotalAll(cacheKey: string): number | null {
  const entry = totalAllCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.ts > TOTAL_ALL_CACHE_TTL_MS) {
    totalAllCache.delete(cacheKey);
    return null;
  }
  return entry.count;
}

function setCachedTotalAll(cacheKey: string, count: number): void {
  totalAllCache.set(cacheKey, { count, ts: Date.now() });
}

function safeObjectIdToString(id: unknown): string | null {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (id instanceof ObjectId) return id.toString();
  if (typeof id === "object" && id !== null && "_id" in id) {
    return (id as { _id?: { toString?: () => string } })._id?.toString?.() || null;
  }
  return null;
}

async function getAssignedToUser(
  db: Db,
  assignedTo: unknown,
  userMap: Map<string, UserData>,
): Promise<{ id: string; firstName: string; lastName: string; email?: string } | null> {
  if (!assignedTo) return null;
  try {
    if (
      typeof assignedTo === "object" &&
      assignedTo !== null &&
      "firstName" in assignedTo &&
      "lastName" in assignedTo
    ) {
      const userObj = assignedTo as { _id: unknown; firstName: string; lastName: string };
      const embeddedId = safeObjectIdToString(userObj._id);
      if (embeddedId) {
        const userFromMap = userMap.get(embeddedId);
        if (userFromMap) {
          return {
            id: userFromMap._id.toString(),
            firstName: userFromMap.firstName,
            lastName: userFromMap.lastName,
            email: userFromMap.email,
          };
        }
        return null;
      }
    }
    const userIdString = safeObjectIdToString(assignedTo);
    if (!userIdString) return null;
    const userFromMap = userMap.get(userIdString);
    if (userFromMap) {
      return {
        id: userFromMap._id.toString(),
        firstName: userFromMap.firstName,
        lastName: userFromMap.lastName,
        email: userFromMap.email,
      };
    }
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userIdString) },
      { projection: { firstName: 1, lastName: 1, email: 1 } },
    );
    if (!user) return null;
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  } catch {
    return null;
  }
}

function parseStringArray(param: string | null): string[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(param);
    return Array.isArray(parsed) ? parsed.map(String) : param === "all" ? [] : [param];
  } catch {
    return param === "all" ? [] : [param];
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function statusFilterValues(statusFilter: string[]): (string | ObjectId)[] {
  const result: (string | ObjectId)[] = [];
  for (const s of statusFilter) {
    const str = String(s).trim();
    if (/^[a-f0-9]{24}$/i.test(str)) {
      result.push(str);
      try {
        result.push(new ObjectId(str));
      } catch {}
    } else if (str.toUpperCase() === "NEW") {
      result.push("NEW", "New", "new");
    } else {
      result.push(str);
    }
  }
  return result;
}

export async function getAllLeadsForSession(
  request: NextRequest,
  sessionUser: SessionUser,
  perf?: ApiRoutePerf,
) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const { page, pageSize } = parseLeadListPagination(searchParams);
  const userFilter = parseStringArray(searchParams.get("user"));
  const countryFilter = parseStringArray(searchParams.get("country"));
  const statusFilter = parseStringArray(searchParams.get("status"));
  const sourceFilter = parseStringArray(searchParams.get("source"));
  const countryMode = searchParams.get("countryMode") === "exclude" ? "exclude" : "include";
  const statusMode = searchParams.get("statusMode") === "exclude" ? "exclude" : "include";
  const sourceMode = searchParams.get("sourceMode") === "exclude" ? "exclude" : "include";
  const userMode = searchParams.get("userMode") === "exclude" ? "exclude" : "include";
  const rawSearch = searchParams.get("search") || "";

  await connectMongoDB();
  perf?.mark("connectMongoDB");
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection not available");

  // Permission-aware PII gating: agents only see unmasked email/phone when
  // their user record explicitly grants `canViewEmails` / `canViewPhoneNumbers`.
  // Admins always see raw values (same model as `GET /api/leads`).
  let canViewEmails = !isTenantStaff(sessionUser.role);
  let canViewPhoneNumbers = !isTenantStaff(sessionUser.role);
  if (isTenantStaff(sessionUser.role)) {
    const flags = await getAgentContactVisibilityFromDb(db, {
      user: {
        id: sessionUser.id,
        email: sessionUser.email ?? undefined,
        adminId: sessionUser.adminId,
        role: sessionUser.role,
      },
    });
    canViewEmails = flags.canViewEmails;
    canViewPhoneNumbers = flags.canViewPhoneNumbers;
  }
  perf?.mark("agent-contact-visibility");

  const baseQuery: LeadFilter = buildTenantLeadBaseQuery(sessionUser);

  const filter: LeadFilter = { ...baseQuery };
  if (canAccessAllLeads(sessionUser) && userFilter.length > 0) {
    const hasUnassigned = userFilter.some((v) => String(v).toLowerCase() === "unassigned");
    const userIds = userFilter
      .filter((v) => String(v).toLowerCase() !== "unassigned")
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);

    if (userMode === "exclude") {
      const excludeClauses: LeadFilter[] = [];
      if (hasUnassigned) {
        // Hide unassigned → keep only leads that have an assignee
        excludeClauses.push({
          assignedTo: { $exists: true, $ne: null },
        } as LeadFilter);
      }
      if (userIds.length > 0) {
        excludeClauses.push({
          $nor: [
            { assignedTo: { $in: userIds } },
            { "assignedTo._id": { $in: userIds } },
          ],
        } as LeadFilter);
      }
      if (excludeClauses.length === 1) {
        Object.assign(filter, excludeClauses[0]);
      } else if (excludeClauses.length > 1) {
        filter.$and = filter.$and
          ? [...filter.$and, ...excludeClauses]
          : excludeClauses;
      }
    } else if (hasUnassigned && userIds.length === 0) {
      filter.$or = [{ assignedTo: null }, { assignedTo: { $exists: false } }];
    } else if (hasUnassigned && userIds.length > 0) {
      filter.$or = [
        { assignedTo: null },
        { assignedTo: { $exists: false } },
        { assignedTo: { $in: userIds } },
        { "assignedTo._id": { $in: userIds } },
      ];
    } else if (userIds.length > 0) {
      filter.$or = [{ assignedTo: { $in: userIds } }, { "assignedTo._id": { $in: userIds } }];
    }
  }
  if (countryFilter.length > 0) {
    const countryPattern = expandCountryFilterValues(countryFilter)
      .map((c) => escapeRegex(String(c).trim()))
      .filter(Boolean)
      .join("|");
    if (countryPattern) {
      const countryRegex = new RegExp(`^(${countryPattern})$`, "i");
      filter.country =
        countryMode === "exclude" ? { $not: countryRegex } : countryRegex;
    }
  }
  if (statusFilter.length > 0) {
    const statusValues = statusFilterValues(statusFilter);
    filter.status = statusMode === "exclude" ? { $nin: statusValues } : { $in: statusValues };
  }
  if (sourceFilter.length > 0) {
    const sourcePattern = sourceFilter
      .map((s) => escapeRegex(String(s).trim()))
      .filter(Boolean)
      .join("|");
    if (sourcePattern) {
      const sourceRegex = new RegExp(`^(${sourcePattern})$`, "i");
      filter.source = sourceMode === "exclude" ? { $not: sourceRegex } : sourceRegex;
    }
  }
  const searchConditions = buildLeadSearchConditions(rawSearch);
  if (searchConditions) {
    const searchOr = { $or: searchConditions };
    filter.$and = filter.$and ? [...filter.$and, searchOr] : [searchOr];
  }

  const countCacheKey = canAccessAllLeads(sessionUser)
    ? `admin:${getTenantAdminId(sessionUser) || sessionUser.id}`
    : `agent:${sessionUser.id}`;
  let totalAllCount = getCachedTotalAll(countCacheKey);
  let totalCount: number;
  if (totalAllCount === null) {
    [totalAllCount, totalCount] = await Promise.all([
      db.collection("leads").countDocuments(baseQuery),
      db.collection("leads").countDocuments(filter),
    ]);
    perf?.mark("countDocuments(baseQuery+filter)");
    setCachedTotalAll(countCacheKey, totalAllCount);
  } else {
    totalCount = await db.collection("leads").countDocuments(filter);
    perf?.mark("countDocuments(filter)");
  }

  const leads = await db
    .collection("leads")
    .find(filter)
    .project(LEADS_LIST_PROJECTION)
    .sort({ lastActivityAt: -1, updatedAt: -1, createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  perf?.mark("find()");

  const uniqueUserIds = new Set<string>();
  leads.forEach((lead: Record<string, unknown>) => {
    const userIdString = safeObjectIdToString(lead.assignedTo);
    if (userIdString) uniqueUserIds.add(userIdString);
  });

  const userMap = new Map<string, UserData>();
  if (uniqueUserIds.size > 0) {
    const users = await db
      .collection("users")
      .find(
        { _id: { $in: Array.from(uniqueUserIds).map((id) => new ObjectId(id)) } },
        { projection: { firstName: 1, lastName: 1, email: 1 } },
      )
      .toArray();
    users.forEach((user) => userMap.set(user._id.toString(), user as UserData));
  }
  perf?.mark("assigned-users-lookup");

  const tenantId = getTenantAdminId(sessionUser);
  const adminIdForComments = tenantId ? new ObjectId(tenantId) : null;
  const leadIds = leads.map(
    (lead: Record<string, unknown>) =>
      (lead._id instanceof ObjectId ? lead._id : new ObjectId(safeObjectIdToString(lead._id) || "")),
  );

  const lastCommentsMap = new Map<string, { content: string; createdAt: Date }>();
  const commentCountsMap = new Map<string, number>();
  const activityCountsMap = new Map<string, number>();
  if (adminIdForComments && leadIds.length > 0) {
    interface LastCommentResult {
      _id: ObjectId;
      content: string;
      createdAt: Date;
    }
    interface CountResult {
      _id: ObjectId;
      count: number;
    }
    const [lastComments, commentCounts, activityCounts] = await Promise.all([
      db
        .collection("comments")
        .aggregate<LastCommentResult>([
          {
            $match: {
              leadId: { $in: leadIds },
              $or: [{ adminId: adminIdForComments }, { adminId: { $exists: false } }],
            },
          },
          { $sort: { createdAt: -1 } },
          { $group: { _id: "$leadId", content: { $first: "$content" }, createdAt: { $first: "$createdAt" } } },
        ])
        .toArray(),
      db
        .collection("comments")
        .aggregate<CountResult>([
          {
            $match: {
              leadId: { $in: leadIds },
              $or: [{ adminId: adminIdForComments }, { adminId: { $exists: false } }],
            },
          },
          { $group: { _id: "$leadId", count: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection("activities")
        .aggregate<CountResult>([
          {
            $match: {
              leadId: { $in: leadIds },
              type: { $ne: "COMMENT" },
              $or: [{ adminId: adminIdForComments }, { adminId: { $exists: false } }],
            },
          },
          { $group: { _id: "$leadId", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);
    lastComments.forEach((comment) =>
      lastCommentsMap.set(comment._id.toString(), { content: comment.content, createdAt: comment.createdAt }),
    );
    commentCounts.forEach((result) => commentCountsMap.set(result._id.toString(), result.count));
    activityCounts.forEach((result) => activityCountsMap.set(result._id.toString(), result.count));
  }
  perf?.mark("comment-activity-aggregations");

  const transformedLeads = await Promise.all(
    leads.map(async (lead: Record<string, unknown>) => {
      let assignedToUser = null;
      if (lead.assignedTo) {
        assignedToUser = await getAssignedToUser(db as unknown as Db, lead.assignedTo, userMap);
      }
      const leadIdString = safeObjectIdToString(lead._id) || "";
      const lastComment = lastCommentsMap.get(leadIdString);
      const timelineCount = (commentCountsMap.get(leadIdString) || 0) + (activityCountsMap.get(leadIdString) || 0);
      return {
        _id: leadIdString,
        id: leadIdString,
        leadId: (lead.leadId as string | number) || undefined,
        firstName: (lead.firstName as string) || "",
        lastName: (lead.lastName as string) || "",
        name: `${(lead.firstName as string) || ""} ${(lead.lastName as string) || ""}`.trim(),
        email: maskEmail((lead.email as string) || "", canViewEmails),
        phone: maskPhone((lead.phone as string) || "", canViewPhoneNumbers),
        source:
          lead.source && typeof lead.source === "string" && lead.source.trim() !== "" && lead.source !== "-"
            ? lead.source.trim()
            : "—",
        status: (lead.status as string) || "NEW",
        country: normalizeCountryInput((lead.country as string) || ""),
        assignedTo: assignedToUser,
        createdAt:
          lead.createdAt instanceof Date
            ? lead.createdAt.toISOString()
            : (lead.createdAt as string) || new Date().toISOString(),
        updatedAt:
          lead.updatedAt instanceof Date
            ? lead.updatedAt.toISOString()
            : (lead.updatedAt as string) || new Date().toISOString(),
        statusChangedAt: lead.statusChangedAt
          ? lead.statusChangedAt instanceof Date
            ? lead.statusChangedAt.toISOString()
            : (lead.statusChangedAt as string)
          : undefined,
        lastActivityAt: lead.lastActivityAt
          ? lead.lastActivityAt instanceof Date
            ? lead.lastActivityAt.toISOString()
            : (lead.lastActivityAt as string)
          : lead.updatedAt instanceof Date
            ? lead.updatedAt.toISOString()
            : (lead.updatedAt as string) || undefined,
        comments: (lead.comments as string) || "",
        lastComment: lastComment?.content || null,
        lastCommentDate: lastComment?.createdAt
          ? lastComment.createdAt instanceof Date
            ? lastComment.createdAt.toISOString()
            : (lastComment.createdAt as unknown as string)
          : null,
        commentCount: timelineCount,
      };
    }),
  );
  perf?.mark("transform");

  return {
    leads: transformedLeads,
    total: totalCount,
    totalAll: totalAllCount,
  };
}

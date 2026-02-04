// /Users/safeconnection/Downloads/drivecrm/src/app/api/leads/all/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { Db, ObjectId } from "mongodb";

// Define the user type for the map
interface UserData {
  _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
}

// MongoDB filter can have $in, $nin, $or, etc.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeadFilter = Record<string, any>;

// Helper to safely convert ObjectId to string
function safeObjectIdToString(id: unknown): string | null {
  if (!id) return null;
  if (typeof id === "string") return id;
  if (id instanceof ObjectId) return id.toString();
  if (typeof id === "object" && id !== null && "_id" in id) {
    return id._id?.toString() || null;
  }
  return null;
}

// Helper to get user details for assignedTo
async function getAssignedToUser(
  db: Db,
  assignedTo: unknown,
  userMap: Map<string, UserData>
): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
} | null> {
  if (!assignedTo) {
    return null;
  }

  try {
    // If assignedTo is already an object with user details, return it directly
    if (
      typeof assignedTo === "object" &&
      assignedTo !== null &&
      "firstName" in assignedTo &&
      "lastName" in assignedTo
    ) {
      const userObj = assignedTo as {
        _id: unknown;
        firstName: string;
        lastName: string;
      };
      return {
        id: safeObjectIdToString(userObj._id) || "",
        firstName: userObj.firstName,
        lastName: userObj.lastName,
      };
    }

    // If it's a string or ObjectId, look up the user from map first
    const userIdString = safeObjectIdToString(assignedTo);
    if (!userIdString) return null;

    // Check if user is in the map
    const userFromMap = userMap.get(userIdString);
    if (userFromMap) {
      return {
        id: userFromMap._id.toString(),
        firstName: userFromMap.firstName,
        lastName: userFromMap.lastName,
        email: userFromMap.email,
      };
    }

    // Fallback to direct database lookup if not in map
    const userId = new ObjectId(userIdString);
    const user = await db
      .collection("users")
      .findOne(
        { _id: userId },
        { projection: { firstName: 1, lastName: 1, email: 1 } }
      );

    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  } catch (error) {
    console.error("Error getting assigned user:", error);
    return null;
  }
}

function parseStringArray(param: string | null): string[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(param);
    return Array.isArray(parsed)
      ? parsed.map(String)
      : param === "all"
        ? []
        : [param];
  } catch {
    return param === "all" ? [] : [param];
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const __timerPrefix = `api:/api/leads/all:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    console.time(`${__timerPrefix}:total`);
    const session = await getServerSession(authOptions);
    if (!session) {
      console.timeEnd(`${__timerPrefix}:total`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10))
    );
    const userFilter = parseStringArray(searchParams.get("user"));
    const countryFilter = parseStringArray(searchParams.get("country"));
    const statusFilter = parseStringArray(searchParams.get("status"));
    const sourceFilter = parseStringArray(searchParams.get("source"));
    const countryMode =
      searchParams.get("countryMode") === "exclude" ? "exclude" : "include";
    const statusMode =
      searchParams.get("statusMode") === "exclude" ? "exclude" : "include";
    const sourceMode =
      searchParams.get("sourceMode") === "exclude" ? "exclude" : "include";
    // URL query spec decodes + as space; restore so "+12263868389" is preserved or " 12263868389" -> "+12263868389"
    const rawSearch = searchParams.get("search") || "";
    let search = rawSearch.trim();
    if (/^\s+\d+$/.test(rawSearch)) search = "+" + rawSearch.replace(/\s/g, "");
    // Digits from raw param so phone matching works even if + was decoded as space
    const digitsOnlyFromRaw = rawSearch.replace(/\D/g, "");

    await connectMongoDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Base query (multi-tenancy). assignedTo can be ObjectId or object { _id, firstName, lastName }
    const baseQuery: LeadFilter = {};
    if (session.user.role === "ADMIN") {
      baseQuery.adminId = new ObjectId(session.user.id);
    } else if (session.user.role === "AGENT") {
      const agentId = new ObjectId(session.user.id);
      baseQuery.$or = [{ assignedTo: agentId }, { "assignedTo._id": agentId }];
    }

    // Full filter: base + filters
    const filter: LeadFilter = { ...baseQuery };

    // User filter: match both ObjectId and object format (assignedTo can be stored either way)
    if (session.user.role === "ADMIN" && userFilter.length > 0) {
      const hasUnassigned = userFilter.some(
        (v) => String(v).toLowerCase() === "unassigned"
      );
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

      if (hasUnassigned && userIds.length === 0) {
        filter.$or = [{ assignedTo: null }, { assignedTo: { $exists: false } }];
      } else if (hasUnassigned && userIds.length > 0) {
        filter.$or = [
          { assignedTo: null },
          { assignedTo: { $exists: false } },
          { assignedTo: { $in: userIds } },
          { "assignedTo._id": { $in: userIds } },
        ];
      } else if (userIds.length > 0) {
        filter.$or = [
          { assignedTo: { $in: userIds } },
          { "assignedTo._id": { $in: userIds } },
        ];
      }
    }

    if (countryFilter.length > 0) {
      filter.country =
        countryMode === "exclude"
          ? { $nin: countryFilter }
          : { $in: countryFilter };
    }
    if (statusFilter.length > 0) {
      filter.status =
        statusMode === "exclude"
          ? { $nin: statusFilter }
          : { $in: statusFilter };
    }
    if (sourceFilter.length > 0) {
      filter.source =
        sourceMode === "exclude"
          ? { $nin: sourceFilter }
          : { $in: sourceFilter };
    }

    // Run search when user typed something or when raw param has 5+ digits (e.g. "+12263868389" decoded as " 12263868389")
    if (search.length > 0 || digitsOnlyFromRaw.length >= 5) {
      const effectiveSearch = search.length > 0 ? search : digitsOnlyFromRaw;
      const regex = new RegExp(escapeRegex(effectiveSearch), "i");
      const searchConditions: LeadFilter[] = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
        { country: regex },
        // Full name: "Timothy Tooktoo" matches firstName + " " + lastName
        {
          $expr: {
            $regexMatch: {
              input: {
                $concat: [
                  { $ifNull: ["$firstName", ""] },
                  " ",
                  { $ifNull: ["$lastName", ""] },
                ],
              },
              regex: escapeRegex(effectiveSearch),
              options: "i",
            },
          },
        },
      ];
      // Lead ID: search "386207" matches leadId (numeric or string in DB)
      const numericSearch = /^\d+$/.test(effectiveSearch)
        ? parseInt(effectiveSearch, 10)
        : null;
      if (numericSearch !== null && !Number.isNaN(numericSearch)) {
        searchConditions.push(
          { leadId: numericSearch },
          { leadId: effectiveSearch }
        );
      }
      // Phone: use digits from raw param so "+12263868389" always finds DB "12263868389"
      if (digitsOnlyFromRaw.length >= 5) {
        searchConditions.push({ phone: digitsOnlyFromRaw });
        const optionalPlusRegex = "^\\s*\\+?\\s*" + digitsOnlyFromRaw + "\\s*$";
        searchConditions.push({
          phone: { $regex: optionalPlusRegex, $options: "i" },
        });
        const phoneDigitsRegex =
          "\\D*" + digitsOnlyFromRaw.split("").join("\\D*");
        searchConditions.push({
          phone: { $regex: phoneDigitsRegex, $options: "i" },
        });
      }
      const searchOr = { $or: searchConditions };
      filter.$and = filter.$and ? [...filter.$and, searchOr] : [searchOr];
    }

    // Counts: totalAll (no filters), total (with filters)
    console.time(`${__timerPrefix}:count`);
    const [totalAllCount, totalCount] = await Promise.all([
      db.collection("leads").countDocuments(baseQuery),
      db.collection("leads").countDocuments(filter),
    ]);
    console.timeEnd(`${__timerPrefix}:count`);

    const skip = (page - 1) * pageSize;
    console.time(`${__timerPrefix}:fetchLeads`);
    const leads = await db
      .collection("leads")
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .toArray();
    console.timeEnd(`${__timerPrefix}:fetchLeads`);

    // Collect unique user IDs for batch lookup
    const uniqueUserIds = new Set<string>();
    leads.forEach((lead: Record<string, unknown>) => {
      const assignedTo = lead.assignedTo;
      if (assignedTo) {
        const userIdString = safeObjectIdToString(assignedTo);
        if (userIdString) {
          uniqueUserIds.add(userIdString);
        }
      }
    });

    // Batch fetch users if there are any
    const userMap = new Map<string, UserData>();
    if (uniqueUserIds.size > 0) {
      console.time(`${__timerPrefix}:fetchUsers`);
      try {
        const userIds = Array.from(uniqueUserIds).map((id) => new ObjectId(id));
        const users = await db
          .collection("users")
          .find(
            { _id: { $in: userIds } },
            { projection: { firstName: 1, lastName: 1, email: 1 } }
          )
          .toArray();

        users.forEach((user) => {
          userMap.set(user._id.toString(), user as UserData);
        });
        console.timeEnd(`${__timerPrefix}:fetchUsers`);
      } catch (error) {
        console.error("Error fetching users:", error);
        // Continue without user data rather than failing completely
      }
    }

    // Get adminId for comment queries
    const adminIdForComments =
      session.user.role === "ADMIN"
        ? new ObjectId(session.user.id)
        : session.user.adminId
          ? new ObjectId(session.user.adminId)
          : null;

    // Collect lead IDs for batch comment lookup
    const leadIds = leads.map((lead: Record<string, unknown>) =>
      lead._id instanceof ObjectId
        ? lead._id
        : new ObjectId(safeObjectIdToString(lead._id) || "")
    );

    // Fetch last comment and comment count for each lead using aggregation
    const lastCommentsMap = new Map<
      string,
      { content: string; createdAt: Date }
    >();
    const commentCountsMap = new Map<string, number>();

    if (adminIdForComments && leadIds.length > 0) {
      console.time(`${__timerPrefix}:commentsAgg`);
      try {
        interface LastCommentResult {
          _id: ObjectId;
          content: string;
          createdAt: Date;
        }

        interface CommentCountResult {
          _id: ObjectId;
          count: number;
        }

        // Get last comment for each lead
        const lastComments = await db
          .collection("comments")
          .aggregate<LastCommentResult>([
            {
              $match: {
                leadId: { $in: leadIds },
                $or: [
                  { adminId: adminIdForComments },
                  { adminId: { $exists: false } },
                ],
              },
            },
            {
              $sort: { createdAt: -1 },
            },
            {
              $group: {
                _id: "$leadId",
                content: { $first: "$content" },
                createdAt: { $first: "$createdAt" },
              },
            },
          ])
          .toArray();

        lastComments.forEach((comment) => {
          lastCommentsMap.set(comment._id.toString(), {
            content: comment.content,
            createdAt: comment.createdAt,
          });
        });

        // Get comment count for each lead
        const commentCounts = await db
          .collection("comments")
          .aggregate<CommentCountResult>([
            {
              $match: {
                leadId: { $in: leadIds },
                $or: [
                  { adminId: adminIdForComments },
                  { adminId: { $exists: false } },
                ],
              },
            },
            {
              $group: {
                _id: "$leadId",
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        commentCounts.forEach((countResult) => {
          commentCountsMap.set(countResult._id.toString(), countResult.count);
        });
        console.timeEnd(`${__timerPrefix}:commentsAgg`);
      } catch (error) {
        console.error("Error fetching comments:", error);
        // Continue without comment data rather than failing completely
      }
    }

    // Transform leads
    console.time(`${__timerPrefix}:transformLeads`);
    const transformedLeads = await Promise.all(
      leads.map(async (lead: Record<string, unknown>) => {
        let assignedToUser = null;
        const originalAssignedTo = lead.assignedTo;

        if (lead.assignedTo) {
          // Try to get user details using the user map
          assignedToUser = await getAssignedToUser(
            db as unknown as Db,
            lead.assignedTo,
            userMap
          );

          // If user lookup failed but assignedTo exists, preserve the original value as a fallback
          // This ensures leads are still counted as assigned even if user details can't be fetched
          if (!assignedToUser && originalAssignedTo) {
            const userIdString = safeObjectIdToString(originalAssignedTo);
            if (userIdString) {
              // Return minimal object with just the ID to indicate assignment
              assignedToUser = {
                id: userIdString,
                firstName: "Unknown",
                lastName: "User",
              };
            }
          }
        }

        // Get last comment and comment count for this lead
        const leadIdString = safeObjectIdToString(lead._id) || "";
        const lastComment = lastCommentsMap.get(leadIdString);
        const lastCommentContent = lastComment?.content || null;
        const lastCommentDate = lastComment?.createdAt
          ? lastComment.createdAt instanceof Date
            ? lastComment.createdAt.toISOString()
            : (lastComment.createdAt as string)
          : null;
        const commentCount = commentCountsMap.get(leadIdString) || 0;

        const transformedLead = {
          _id: leadIdString,
          id: leadIdString,
          leadId: (lead.leadId as number) || undefined,
          firstName: (lead.firstName as string) || "",
          lastName: (lead.lastName as string) || "",
          name: `${(lead.firstName as string) || ""} ${(lead.lastName as string) || ""}`.trim(),
          email: (lead.email as string) || "",
          phone: (lead.phone as string) || "",
          source:
            lead.source &&
            typeof lead.source === "string" &&
            lead.source.trim() !== "" &&
            lead.source !== "-"
              ? lead.source.trim()
              : "—",
          status: (lead.status as string) || "NEW",
          country: (lead.country as string) || "",
          assignedTo: assignedToUser,
          createdAt:
            lead.createdAt instanceof Date
              ? lead.createdAt.toISOString()
              : (lead.createdAt as string) || new Date().toISOString(),
          updatedAt:
            lead.updatedAt instanceof Date
              ? lead.updatedAt.toISOString()
              : (lead.updatedAt as string) || new Date().toISOString(),
          comments: (lead.comments as string) || "",
          lastComment: lastCommentContent,
          lastCommentDate: lastCommentDate,
          commentCount: commentCount,
        };

        return transformedLead;
      })
    );
    console.timeEnd(`${__timerPrefix}:transformLeads`);
    console.timeEnd(`${__timerPrefix}:total`);

    return NextResponse.json({
      leads: transformedLeads,
      total: totalCount,
      totalAll: totalAllCount,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);

    let errorMessage = "Failed to fetch leads";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 408;
      } else if (error.message.includes("connection")) {
        errorMessage = "Database connection error. Please try again.";
        statusCode = 503;
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Unauthorized access";
        statusCode = 401;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

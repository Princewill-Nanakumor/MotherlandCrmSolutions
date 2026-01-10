// /Users/safeconnection/Downloads/drivecrm/src/app/api/leads/all/route.ts

import { NextResponse } from "next/server";
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

// Define query type for MongoDB filters
interface LeadQuery {
  adminId?: ObjectId;
  assignedTo?: ObjectId;
}

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectMongoDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Build query based on user role
    const query: LeadQuery = {};

    if (session.user.role === "ADMIN") {
      // Admin sees all leads that belong to them (adminId matches their ID)
      query.adminId = new ObjectId(session.user.id);
    } else if (session.user.role === "AGENT") {
      // Agent sees only leads assigned to them
      query.assignedTo = new ObjectId(session.user.id);
    }

    // Fetch leads with multi-tenancy filter
    const leads = await db
      .collection("leads")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

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
      } catch (error) {
        console.error("Error fetching users:", error);
        // Continue without user data rather than failing completely
      }
    }

    // Get adminId for comment queries
    const adminIdForComments = session.user.role === "ADMIN"
      ? new ObjectId(session.user.id)
      : session.user.adminId
        ? new ObjectId(session.user.adminId)
        : null;

    // Collect lead IDs for batch comment lookup
    const leadIds = leads.map((lead: Record<string, unknown>) => 
      lead._id instanceof ObjectId ? lead._id : new ObjectId(safeObjectIdToString(lead._id) || "")
    );

    // Fetch last comment and comment count for each lead using aggregation
    const lastCommentsMap = new Map<string, { content: string; createdAt: Date }>();
    const commentCountsMap = new Map<string, number>();
    
    if (adminIdForComments && leadIds.length > 0) {
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
                  { adminId: { $exists: false } }
                ]
              }
            },
            {
              $sort: { createdAt: -1 }
            },
            {
              $group: {
                _id: "$leadId",
                content: { $first: "$content" },
                createdAt: { $first: "$createdAt" }
              }
            }
          ])
          .toArray();

        lastComments.forEach((comment) => {
          lastCommentsMap.set(comment._id.toString(), {
            content: comment.content,
            createdAt: comment.createdAt
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
                  { adminId: { $exists: false } }
                ]
              }
            },
            {
              $group: {
                _id: "$leadId",
                count: { $sum: 1 }
              }
            }
          ])
          .toArray();

        commentCounts.forEach((countResult) => {
          commentCountsMap.set(countResult._id.toString(), countResult.count);
        });
      } catch (error) {
        console.error("Error fetching comments:", error);
        // Continue without comment data rather than failing completely
      }
    }

    // Transform leads
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
          ? (lastComment.createdAt instanceof Date
              ? lastComment.createdAt.toISOString()
              : (lastComment.createdAt as string))
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
          source: (lead.source as string) && (lead.source as string) !== "-" ? (lead.source as string) : "—",
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

    return NextResponse.json(transformedLeads);
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

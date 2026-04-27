// app/api/leads/assigned/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { agentAssignedToUserClause } from "@/lib/leadAssignmentQuery";
import { maskEmail, maskPhone } from "@/lib/contactMasking";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedResponse();

    await connectMongoDB();
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Resolve the tenant scope id. We MUST always include adminId in the
    // query — agents that are missing adminId are not allowed through.
    let scopedAdminId: mongoose.Types.ObjectId | null = null;
    if (session.user.role === "ADMIN") {
      scopedAdminId = userObjectId;
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      scopedAdminId = new mongoose.Types.ObjectId(session.user.adminId);
    }
    if (!scopedAdminId) {
      return forbiddenResponse("Admin scope unresolved");
    }

    let canViewEmails = session.user.role !== "AGENT";
    let canViewPhoneNumbers = session.user.role !== "AGENT";
    if (session.user.role === "AGENT" && mongoose.connection.db) {
      const me = await mongoose.connection.db.collection("users").findOne(
        { _id: userObjectId },
        { projection: { canViewEmails: 1, canViewPhoneNumbers: 1 } },
      );
      canViewEmails = Boolean(me?.canViewEmails);
      canViewPhoneNumbers = Boolean(me?.canViewPhoneNumbers);
    }

    const query: Record<string, unknown> =
      session.user.role === "ADMIN"
        ? {
            adminId: scopedAdminId,
            $and: [
              { assignedTo: { $exists: true } },
              { assignedTo: { $ne: null } },
            ],
          }
        : {
            adminId: scopedAdminId,
            ...agentAssignedToUserClause(session.user.id),
          };

    const assignedLeads = await mongoose.connection.db
      .collection("leads")
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    const adminIdForComments = scopedAdminId;

    // Collect lead IDs for batch comment lookup
    const leadIds = assignedLeads.map(
      (lead: { _id: mongoose.Types.ObjectId }) => lead._id
    );

    // Fetch last comment and timeline count (comments + activities) for each lead using aggregation
    const lastCommentsMap = new Map<
      string,
      { content: string; createdAt: Date }
    >();
    const commentCountsMap = new Map<string, number>();
    const activityCountsMap = new Map<string, number>();

    if (adminIdForComments && leadIds.length > 0) {
      try {
        interface LastCommentResult {
          _id: mongoose.Types.ObjectId;
          content: string;
          createdAt: Date;
        }

        interface CommentCountResult {
          _id: mongoose.Types.ObjectId;
          count: number;
        }

        interface ActivityCountResult {
          _id: mongoose.Types.ObjectId;
          count: number;
        }

        // Get last comment, comment count and activity count
        const [lastComments, commentCounts, activityCounts] = await Promise.all([
          mongoose.connection.db
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
          .toArray(),
          mongoose.connection.db
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
            .toArray(),
          mongoose.connection.db
            .collection("activities")
            .aggregate<ActivityCountResult>([
              {
                $match: {
                  leadId: { $in: leadIds },
                  type: { $ne: "COMMENT" },
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
            .toArray(),
        ]);

        lastComments.forEach((comment) => {
          lastCommentsMap.set(comment._id.toString(), {
            content: comment.content,
            createdAt: comment.createdAt,
          });
        });

        commentCounts.forEach((countResult) => {
          commentCountsMap.set(countResult._id.toString(), countResult.count);
        });

        activityCounts.forEach((countResult) => {
          activityCountsMap.set(countResult._id.toString(), countResult.count);
        });
      } catch (error) {
        console.error("Error fetching comments:", error);
        // Continue without comment data rather than failing completely
      }
    }

    // Transform the leads to match the expected format
    const transformedLeads = assignedLeads.map((lead) => {
      // Handle different assignedTo formats
      let assignedToUser = null;
      if (lead.assignedTo) {
        if (typeof lead.assignedTo === "object" && lead.assignedTo._id) {
          // Object format
          assignedToUser = {
            id: lead.assignedTo._id.toString(),
            firstName: lead.assignedTo.firstName,
            lastName: lead.assignedTo.lastName,
          };
        } else if (typeof lead.assignedTo === "string") {
          // String format
          assignedToUser = {
            id: lead.assignedTo,
            firstName: "Unknown",
            lastName: "User",
          };
        }
      }

      // Get last comment and timeline count (comments + activities) for this lead
      const leadIdString = lead._id.toString();
      const lastComment = lastCommentsMap.get(leadIdString);
      const lastCommentContent = lastComment?.content || null;
      const lastCommentDate = lastComment?.createdAt
        ? lastComment.createdAt instanceof Date
          ? lastComment.createdAt.toISOString()
          : (lastComment.createdAt as string)
        : null;
      const commentCount = commentCountsMap.get(leadIdString) || 0;
      const activityCount = activityCountsMap.get(leadIdString) || 0;
      const timelineCount = commentCount + activityCount;

      return {
        _id: leadIdString,
        leadId: (lead.leadId as string | number | undefined) ?? undefined,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: maskEmail(lead.email, canViewEmails),
        phone: maskPhone(lead.phone || "", canViewPhoneNumbers),
        country: lead.country || "",
        value: lead.value,
        source: lead.source && lead.source !== "-" ? lead.source : "—",
        status: lead.status,
        comments: lead.comments || "",
        lastComment: lastCommentContent,
        lastCommentDate: lastCommentDate,
        // commentCount now represents full timeline length: comments + activities
        commentCount: timelineCount,
        assignedAt: lead.assignedAt || lead.updatedAt,
        assignedTo: assignedToUser,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        statusChangedAt: lead.statusChangedAt
          ? lead.statusChangedAt instanceof Date
            ? lead.statusChangedAt.toISOString()
            : (lead.statusChangedAt as string)
          : undefined,
      };
    });

    return NextResponse.json({
      assignedLeads: transformedLeads,
      count: transformedLeads.length,
    });
  } catch (error) {
    console.error("Error fetching assigned leads:", error);
    return NextResponse.json(
      { message: "Error fetching assigned leads" },
      { status: 500 },
    );
  }
}

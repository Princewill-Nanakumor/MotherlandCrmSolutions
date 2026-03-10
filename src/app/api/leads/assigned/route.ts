// app/api/leads/assigned/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    // Check if database connection is available
    if (!mongoose.connection.db) {
      throw new Error("Database connection not available");
    }

    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    console.log("=== ASSIGNED LEADS GET REQUEST ===");
    console.log("User adminId:", session.user.adminId);

    // Build query based on user role and multi-tenancy
    let query: {
      $or?: Array<{
        "assignedTo._id"?: mongoose.Types.ObjectId;
        assignedTo?: mongoose.Types.ObjectId;
      }>;
      adminId?: mongoose.Types.ObjectId;
    } = {};

    if (session.user.role === "ADMIN") {
      // Admin sees all assigned leads that belong to them
      query = {
        $or: [
          { "assignedTo._id": userObjectId }, // Object format
          { assignedTo: userObjectId }, // String/ObjectId format
        ],
        adminId: userObjectId, // Multi-tenancy: only leads created by this admin
      };
    } else if (session.user.role === "AGENT") {
      // Agent sees only leads assigned to them from their admin
      const adminId = session.user.adminId
        ? new mongoose.Types.ObjectId(session.user.adminId)
        : undefined;

      query = {
        $or: [
          { "assignedTo._id": userObjectId }, // Object format
          { assignedTo: userObjectId }, // String/ObjectId format
        ],
        ...(adminId && { adminId }), // Multi-tenancy: only leads from their admin
      };
    }

    console.log("Assigned leads query:", JSON.stringify(query, null, 2));

    const assignedLeads = await mongoose.connection.db
      .collection("leads")
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();

    console.log("Found assigned leads count:", assignedLeads.length);

    // Get adminId for comment queries
    const adminIdForComments =
      session.user.role === "ADMIN"
        ? userObjectId
        : session.user.adminId
          ? new mongoose.Types.ObjectId(session.user.adminId)
          : null;

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
        leadId: (lead.leadId as number) || undefined,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone || "",
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

    console.log("Transformed leads count:", transformedLeads.length);
    console.log(
      "First lead sample:",
      JSON.stringify(transformedLeads[0], null, 2)
    );

    return NextResponse.json({
      assignedLeads: transformedLeads,
      count: transformedLeads.length,
    });
  } catch (error) {
    console.error("Error fetching assigned leads:", error);
    return NextResponse.json(
      {
        message: "Error fetching assigned leads",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

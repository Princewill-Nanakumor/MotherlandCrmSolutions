// src/app/api/calls/user/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import CallLog from "@/models/CallLog";
import Comment from "@/models/Comment";
import User from "@/models/User";
import mongoose from "mongoose";
import { getTenantAdminId, isTenantStaff } from "@/lib/roles";
import {
  buildLeadStatusDisplayMap,
  resolveLeadStatusDisplay,
} from "@/lib/leadStatusResolve";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";
export const revalidate = 0;

interface PopulatedLead {
  _id: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  leadId?: number | string;
  country?: string;
  source?: string;
  status?: string;
}

interface CallLogDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  leadId?: PopulatedLead | mongoose.Types.ObjectId | null;
  phoneNumber: string;
  dialer: string;
  createdAt: Date;
}

interface CommentDoc {
  leadId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

function resolveLeadId(leadId: CallLogDoc["leadId"]): string | null {
  if (!leadId) return null;
  if (typeof leadId === "object" && "_id" in leadId) {
    return leadId._id.toString();
  }
  return String(leadId);
}

/**
 * Comment belonging to this call session on the lead:
 * after the previous call on the same lead, and before the next one
 * (or "now" if this is the latest call). Covers comment-then-dial and
 * dial-then-comment without requiring a full page refresh.
 */
function findCommentForCall(
  commentsByLead: Map<string, CommentDoc[]>,
  leadId: string | null,
  previousCallAt: Date | null,
  nextCallAt: Date | null,
): { content: string; createdAt: Date } | null {
  if (!leadId) return null;
  const comments = commentsByLead.get(leadId);
  if (!comments?.length) return null;

  const lowerMs = previousCallAt ? new Date(previousCallAt).getTime() : 0;
  const upperMs = nextCallAt
    ? new Date(nextCallAt).getTime()
    : Date.now();

  for (const comment of comments) {
    const t = new Date(comment.createdAt).getTime();
    if (t > lowerMs && t <= upperMs) {
      return { content: comment.content, createdAt: comment.createdAt };
    }
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view call logs of other users
    // Users can view their own call logs
    const isAdmin = session.user.role === "ADMIN";
    const { userId: requestedUserId } = await params;

    if (!isAdmin && session.user.id !== requestedUserId) {
      return NextResponse.json(
        { error: "Forbidden - You can only view your own call logs" },
        { status: 403 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await connectMongoDB();

    if (isAdmin) {
      const targetUser = await User.findById(requestedUserId)
        .select("role adminId")
        .lean<{
          role?: string;
          adminId?: mongoose.Types.ObjectId;
        } | null>();

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const inSameTenant =
        requestedUserId === session.user.id ||
        (isTenantStaff(targetUser.role) &&
          targetUser.adminId?.toString() === session.user.id);

      if (!inSameTenant) {
        return NextResponse.json(
          { error: "Forbidden - User is not in your organization" },
          { status: 403 },
        );
      }
    }

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const callLogs = (await CallLog.find({
      userId: new mongoose.Types.ObjectId(requestedUserId),
      createdAt: { $gte: threeDaysAgo },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "leadId",
        select: "firstName lastName leadId country source status",
        model: "Lead",
      })
      .lean()) as CallLogDoc[];

    const tenantId = getTenantAdminId(session.user);
    if (!tenantId) {
      return NextResponse.json({ error: "Admin scope unresolved" }, { status: 403 });
    }
    const statusMap = await buildLeadStatusDisplayMap(
      new mongoose.Types.ObjectId(tenantId),
    );

    const leadObjectIds = Array.from(
      new Set(
        callLogs
          .map((log) => resolveLeadId(log.leadId))
          .filter((id): id is string => !!id && mongoose.Types.ObjectId.isValid(id)),
      ),
    ).map((id) => new mongoose.Types.ObjectId(id));

    const commentsByLead = new Map<string, CommentDoc[]>();
    if (leadObjectIds.length > 0) {
      // Newest first so we can pick the first comment at-or-before call time.
      // Look further back than 3 days so a comment just before the retention
      // window still attaches to a call inside the window.
      const commentLookback = new Date(threeDaysAgo);
      commentLookback.setDate(commentLookback.getDate() - 7);

      const comments = await Comment.find({
        leadId: { $in: leadObjectIds },
        "createdBy._id": requestedUserId,
        createdAt: { $gte: commentLookback },
      })
        .select({ leadId: 1, content: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .lean<CommentDoc[]>();

      for (const comment of comments) {
        const key = comment.leadId.toString();
        const list = commentsByLead.get(key);
        if (list) list.push(comment);
        else commentsByLead.set(key, [comment]);
      }
    }

    const formattedLogs = callLogs.map((log, index) => {
      const lead =
        log.leadId &&
        typeof log.leadId === "object" &&
        "_id" in log.leadId &&
        "firstName" in log.leadId
          ? (log.leadId as PopulatedLead)
          : null;

      const leadIdStr = lead ? lead._id.toString() : resolveLeadId(log.leadId);

      // callLogs are newest-first: next chronological call on this lead is
      // earlier in the array; previous is later in the array.
      let previousCallAt: Date | null = null;
      let nextCallAt: Date | null = null;
      if (leadIdStr) {
        for (let j = index - 1; j >= 0; j--) {
          if (resolveLeadId(callLogs[j].leadId) === leadIdStr) {
            nextCallAt = callLogs[j].createdAt;
            break;
          }
        }
        for (let j = index + 1; j < callLogs.length; j++) {
          if (resolveLeadId(callLogs[j].leadId) === leadIdStr) {
            previousCallAt = callLogs[j].createdAt;
            break;
          }
        }
      }

      const priorComment = findCommentForCall(
        commentsByLead,
        leadIdStr,
        previousCallAt,
        nextCallAt,
      );

      return {
        id: log._id.toString(),
        userId: log.userId.toString(),
        leadId: lead ? lead._id.toString() : leadIdStr,
        leadName: lead
          ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() ||
            "Unknown Lead"
          : null,
        leadDisplayId: lead?.leadId || null,
        leadCountry: lead?.country || null,
        leadSource: lead?.source || null,
        leadStatus: lead
          ? resolveLeadStatusDisplay(lead.status, statusMap)
          : null,
        phoneNumber: log.phoneNumber,
        dialer: log.dialer,
        createdAt: log.createdAt,
        comment: priorComment
          ? {
              content: priorComment.content,
              createdAt: priorComment.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        callLogs: formattedLogs,
        count: formattedLogs.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch call logs" },
      { status: 500 },
    );
  }
}

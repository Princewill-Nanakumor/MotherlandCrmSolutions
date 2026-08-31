// app/api/leads/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Comment, { IComment } from "@/models/Comment";
import Lead from "@/models/Lead";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { singleLeadAccessFilter } from "@/lib/leadAssignmentQuery";
import { canAccessAllLeads, getTenantAdminId } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";
import {
  sessionPerfMark,
  withSessionPerf,
} from "@/lib/sessionPerfProbe";
import { probeMongoConnect, probeMongoQuery, withMongoPerf } from "@/lib/mongoPerfProbe";

function extractLeadIdFromUrl(urlString: string): string {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  return parts[parts.length - 2];
}

interface SessionUser {
  id: string;
  role: "ADMIN" | "AGENT";
  adminId?: string;
  firstName?: string;
  lastName?: string;
}

interface Session {
  user: SessionUser;
}

function getCorrectAdminId(session: Session): mongoose.Types.ObjectId | null {
  const tenantId = getTenantAdminId(session.user);
  return tenantId ? new mongoose.Types.ObjectId(tenantId) : null;
}

export async function GET(request: Request) {
  const wallStart = Date.now();
  const [response] = await withMongoPerf(async () => {
    const perf = new ApiRoutePerf("GET /api/leads/[id]/comments");
    try {
      const id = extractLeadIdFromUrl(request.url);
      const [session, sessionProbe] = await withSessionPerf(async () => {
        sessionPerfMark("getServerSessionEnter");
        const s = (await getServerSession(authOptions)) as Session | null;
        sessionPerfMark("getServerSessionExit");
        return s;
      });
      perf.mark("getServerSession");
      if (!session) return unauthorizedResponse();

      if (!mongoose.Types.ObjectId.isValid(id)) {
        perf.finish({ status: 400 });
        return NextResponse.json({ message: "Invalid lead id" }, { status: 400 });
      }

      await probeMongoConnect();
      perf.mark("connectMongoDB");
      const adminId = getCorrectAdminId(session);
      if (!adminId) {
        perf.finish({ status: 403 });
        return forbiddenResponse("Admin scope unresolved");
      }

      const leadObjectId = new mongoose.Types.ObjectId(id);

      const lead = await probeMongoQuery(
        "leadAccessCheck",
        "mongoose",
        () =>
          Lead.findOne(
            singleLeadAccessFilter(
              leadObjectId,
              adminId,
              session.user.role,
              session.user.id,
              canAccessAllLeads(session.user),
            ),
          )
            .select({ _id: 1 })
            .lean(),
        { collection: "leads", filter: { _id: String(leadObjectId) } },
      );
      perf.mark("leadAccessCheck");
      if (!lead) {
        perf.finish({ status: 404 });
        return NextResponse.json(
          { message: "Lead not found or not authorized" },
          { status: 404 },
        );
      }

      const comments = await probeMongoQuery(
        "fetchComments",
        "mongoose",
        () =>
          Comment.find({
            leadId: leadObjectId,
            $or: [{ adminId }, { adminId: { $exists: false } }, { adminId: null }],
          })
            .sort({ createdAt: -1 })
            .lean<IComment[]>(),
        { collection: "comments", filter: { leadId: String(leadObjectId) } },
      );
      perf.mark("fetchComments");

      return apiPerfJsonResponse(perf, comments, {
        sessionProbe,
        wallMs: Date.now() - wallStart,
        extra: { count: comments.length },
      });
    } catch (error) {
      console.error("Error in comments GET endpoint:", error);
      perf.finish({ error: true, wallMs: Date.now() - wallStart });
      return NextResponse.json(
        { success: false, message: "Error fetching comments" },
        { status: 500 },
      );
    }
  });
  return response;
}

export async function POST(request: Request) {
  try {
    const id = extractLeadIdFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session) return unauthorizedResponse();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid lead id" }, { status: 400 });
    }

    const { content } = await request.json();
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { message: "Comment content is required" },
        { status: 400 },
      );
    }
    if (content.length > 10_000) {
      return NextResponse.json(
        { message: "Comment content too long" },
        { status: 400 },
      );
    }

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);
    if (!adminId) return forbiddenResponse("Admin scope unresolved");

    const leadObjectId = new mongoose.Types.ObjectId(id);
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
    if (!lead) {
      return NextResponse.json(
        { message: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    const canonicalLeadId = leadObjectId.toString();

    const savedComment = await Comment.create({
      leadId: leadObjectId,
      content: content.trim(),
      adminId,
      createdBy: {
        _id: session.user.id,
        firstName: session.user.firstName || "",
        lastName: session.user.lastName || "",
      },
    });

    await Lead.updateOne(
      { _id: leadObjectId },
      {
        $set: {
          lastActivityAt: savedComment.createdAt,
          updatedAt: savedComment.createdAt,
        },
      },
    );

    try {
      await publishLeadUpdatedEvent(adminId.toString(), canonicalLeadId, {
        type: "comment_created",
        leadId: canonicalLeadId,
        commentId: savedComment._id.toString(),
      });
      await publishAdminLeadsUpdatedEvent(adminId.toString(), {
        type: "comment_created",
        leadId: canonicalLeadId,
        commentId: savedComment._id.toString(),
      });
    } catch (publishError) {
      console.error("Failed to publish realtime comment event:", publishError);
    }

    return NextResponse.json(savedComment);
  } catch (error) {
    console.error("Error in comments POST endpoint:", error);
    return NextResponse.json(
      { message: "Error creating comment" },
      { status: 500 },
    );
  }
}

// app/api/leads/[id]/comments/[commentId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Comment from "@/models/Comment";
import Lead from "@/models/Lead";
import mongoose from "mongoose";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { singleLeadAccessFilter } from "@/lib/leadAssignmentQuery";
import { canAccessAllLeads, canDeleteComments, getTenantAdminId } from "@/lib/roles";

function extractParamsFromUrl(urlString: string): {
  id: string;
  commentId: string;
} {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  const commentId = parts[parts.length - 1];
  const id = parts[parts.length - 3];
  return { id, commentId };
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

interface CommentDocument {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  content: string;
  adminId?: mongoose.Types.ObjectId;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

function getCorrectAdminId(session: Session): mongoose.Types.ObjectId | null {
  const tenantId = getTenantAdminId(session.user);
  return tenantId ? new mongoose.Types.ObjectId(tenantId) : null;
}

/**
 * Fail-closed authorization: only allow editing/deleting comments where
 *  - the comment carries an explicit adminId matching the user's tenant, AND
 *  - the lead the comment belongs to also belongs to that tenant.
 * Legacy comments without adminId are backfilled to the lead's adminId before mutation.
 */
async function authorizeAndResolveComment(
  commentId: string,
  leadId: string,
  scopedAdminId: mongoose.Types.ObjectId,
  sessionUser: { id: string; role: string; permissions?: string[] },
): Promise<
  | { ok: true; comment: CommentDocument }
  | { ok: false; status: number; message: string }
> {
  if (
    !mongoose.Types.ObjectId.isValid(commentId) ||
    !mongoose.Types.ObjectId.isValid(leadId)
  ) {
    return { ok: false, status: 400, message: "Invalid id" };
  }

  const lead = await Lead.findOne(
    singleLeadAccessFilter(
      new mongoose.Types.ObjectId(leadId),
      scopedAdminId,
      sessionUser.role,
      sessionUser.id,
      canAccessAllLeads(sessionUser),
    ),
  )
    .select({ _id: 1 })
    .lean();
  if (!lead) {
    return { ok: false, status: 404, message: "Lead not found or not authorized" };
  }

  const canModerate = canDeleteComments(sessionUser);

  const comment = (await Comment.findOne({
    _id: new mongoose.Types.ObjectId(commentId),
    leadId: new mongoose.Types.ObjectId(leadId),
  }).lean()) as CommentDocument | null;
  if (!comment) {
    return { ok: false, status: 404, message: "Comment not found" };
  }

  if (comment.adminId && !comment.adminId.equals(scopedAdminId)) {
    return { ok: false, status: 404, message: "Comment not found" };
  }

  if (!canModerate) {
    const creatorId = comment.createdBy?._id?.toString?.();
    if (!creatorId || creatorId !== sessionUser.id) {
      return { ok: false, status: 403, message: "Only the author or an admin can modify this comment" };
    }
  }

  if (!comment.adminId) {
    await Comment.updateOne(
      { _id: comment._id, $or: [{ adminId: { $exists: false } }, { adminId: null }] },
      { $set: { adminId: scopedAdminId } },
    );
    comment.adminId = scopedAdminId;
  }

  return { ok: true, comment };
}

export async function PUT(request: Request) {
  try {
    const { id, commentId } = extractParamsFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session) return unauthorizedResponse();

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json(
        { message: "Comment content is required" },
        { status: 400 },
      );
    }

    if (typeof content !== "string" || content.length > 10_000) {
      return NextResponse.json(
        { message: "Comment content invalid" },
        { status: 400 },
      );
    }

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);
    if (!adminId) return forbiddenResponse("Admin scope unresolved");

    const auth = await authorizeAndResolveComment(
      commentId,
      id,
      adminId,
      session.user,
    );
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const canonicalLeadId = auth.comment.leadId.toString();

    const updated = await Comment.findOneAndUpdate(
      { _id: auth.comment._id, adminId },
      { content: content.trim() },
      { new: true },
    ).lean<CommentDocument>();

    if (!updated) {
      return NextResponse.json(
        { message: "Comment not found or not authorized" },
        { status: 404 },
      );
    }

    await Lead.updateOne(
      { _id: auth.comment.leadId, adminId },
      {
        $set: {
          lastActivityAt: updated.updatedAt,
          updatedAt: updated.updatedAt,
        },
      },
    );

    try {
      await publishLeadUpdatedEvent(adminId.toString(), canonicalLeadId, {
        type: "comment_updated",
        leadId: canonicalLeadId,
        commentId: updated._id.toString(),
      });
      await publishAdminLeadsUpdatedEvent(adminId.toString(), {
        type: "comment_updated",
        leadId: canonicalLeadId,
        commentId: updated._id.toString(),
      });
    } catch (publishError) {
      console.error("Failed to publish realtime comment update event:", publishError);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json(
      { message: "Error updating comment" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, commentId } = extractParamsFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session) return unauthorizedResponse();

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);
    if (!adminId) return forbiddenResponse("Admin scope unresolved");

    const auth = await authorizeAndResolveComment(
      commentId,
      id,
      adminId,
      session.user,
    );
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const canonicalLeadId = auth.comment.leadId.toString();

    const deleted = await Comment.findOneAndDelete({
      _id: auth.comment._id,
      adminId,
    }).lean<CommentDocument>();

    if (!deleted) {
      return NextResponse.json(
        { message: "Comment not found or not authorized" },
        { status: 404 },
      );
    }

    const activityAt = new Date();
    await Lead.updateOne(
      { _id: auth.comment.leadId, adminId },
      { $set: { lastActivityAt: activityAt, updatedAt: activityAt } },
    );

    try {
      await publishLeadUpdatedEvent(adminId.toString(), canonicalLeadId, {
        type: "comment_deleted",
        leadId: canonicalLeadId,
        commentId: deleted._id.toString(),
      });
      await publishAdminLeadsUpdatedEvent(adminId.toString(), {
        type: "comment_deleted",
        leadId: canonicalLeadId,
        commentId: deleted._id.toString(),
      });
    } catch (publishError) {
      console.error("Failed to publish realtime comment delete event:", publishError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { message: "Error deleting comment" },
      { status: 500 },
    );
  }
}

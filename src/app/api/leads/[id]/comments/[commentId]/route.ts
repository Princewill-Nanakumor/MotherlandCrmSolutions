// app/api/leads/[id]/comments/[commentId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Comment from "@/models/Comment";
import mongoose from "mongoose";
import { publishLeadUpdatedEvent } from "@/libs/ablyServer";

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

// Define comment document interface for lean queries
interface CommentDocument {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  content: string;
  adminId?: mongoose.Types.ObjectId; // Make adminId optional
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Utility function to determine correct adminId based on user role
function getCorrectAdminId(session: Session): mongoose.Types.ObjectId {
  if (session.user.role === "ADMIN") {
    return new mongoose.Types.ObjectId(session.user.id);
  } else if (session.user.role === "AGENT" && session.user.adminId) {
    return new mongoose.Types.ObjectId(session.user.adminId);
  }
  throw new Error("Invalid user role or missing adminId for agent");
}

export async function PUT(request: Request) {
  try {
    const { id, commentId } = extractParamsFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content?.trim()) {
      return NextResponse.json(
        { message: "Comment content is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);

    console.log("=== COMMENT PUT REQUEST ===");
    console.log("Lead ID:", id);
    console.log("Comment ID:", commentId);
    console.log("Admin ID:", adminId.toString());
    console.log("Content:", content);

    // Build query that handles both old comments (without adminId) and new comments (with adminId)
    const query: {
      _id: string;
      leadId: string;
      $or: Array<
        { adminId?: mongoose.Types.ObjectId } | { adminId: { $exists: false } }
      >;
    } = {
      _id: commentId,
      leadId: id,
      $or: [
        { adminId: adminId }, // New comments with adminId
        { adminId: { $exists: false } }, // Old comments without adminId
      ],
    };

    console.log("Update query:", JSON.stringify(query, null, 2));

    const updated = await Comment.findOneAndUpdate(
      query,
      { content: content.trim() },
      { new: true }
    ).lean<CommentDocument>();

    if (!updated) {
      console.log("Comment not found with query:", query);
      return NextResponse.json(
        { message: "Comment not found or not authorized" },
        { status: 404 }
      );
    }

    console.log("Comment updated successfully:", updated._id.toString());

    // Don't create activity log for comment edits - they are displayed directly in the comments section
    // Activities should only log non-comment actions like status changes, assignments, etc.

    try {
      await publishLeadUpdatedEvent(adminId.toString(), id, {
        type: "comment_updated",
        leadId: id,
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
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { id, commentId } = extractParamsFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);

    console.log("=== COMMENT DELETE REQUEST ===");
    console.log("Lead ID:", id);
    console.log("Comment ID:", commentId);
    console.log("Admin ID:", adminId.toString());

    // Build query that handles both old comments (without adminId) and new comments (with adminId)
    const query: {
      _id: string;
      leadId: string;
      $or: Array<
        { adminId?: mongoose.Types.ObjectId } | { adminId: { $exists: false } }
      >;
    } = {
      _id: commentId,
      leadId: id,
      $or: [
        { adminId: adminId }, // New comments with adminId
        { adminId: { $exists: false } }, // Old comments without adminId
      ],
    };

    console.log("Delete query:", JSON.stringify(query, null, 2));

    const deleted =
      await Comment.findOneAndDelete(query).lean<CommentDocument>();

    if (!deleted) {
      console.log("Comment not found with query:", query);
      return NextResponse.json(
        { message: "Comment not found or not authorized" },
        { status: 404 }
      );
    }

    console.log("Comment deleted successfully:", deleted._id.toString());

    // Don't create activity log for comment deletions - they are displayed directly in the comments section
    // Activities should only log non-comment actions like status changes, assignments, etc.

    try {
      await publishLeadUpdatedEvent(adminId.toString(), id, {
        type: "comment_deleted",
        leadId: id,
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
      { status: 500 }
    );
  }
}

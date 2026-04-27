// app/api/leads/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Comment, { IComment } from "@/models/Comment";
import Lead from "@/models/Lead";
import { publishLeadUpdatedEvent } from "@/libs/ablyServer";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";

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
  if (session.user.role === "ADMIN") {
    return new mongoose.Types.ObjectId(session.user.id);
  }
  if (session.user.role === "AGENT" && session.user.adminId) {
    return new mongoose.Types.ObjectId(session.user.adminId);
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const id = extractLeadIdFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session) return unauthorizedResponse();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid lead id" }, { status: 400 });
    }

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);
    if (!adminId) return forbiddenResponse("Admin scope unresolved");

    const leadObjectId = new mongoose.Types.ObjectId(id);

    // Verify the lead is in the caller's tenant before returning any comments,
    // so legacy comments (without adminId) cannot leak across tenants.
    const lead = await Lead.findOne({ _id: leadObjectId, adminId })
      .select({ _id: 1 })
      .lean();
    if (!lead) {
      return NextResponse.json(
        { message: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    const comments = await Comment.find({
      leadId: leadObjectId,
      $or: [{ adminId }, { adminId: { $exists: false } }, { adminId: null }],
    })
      .sort({ createdAt: -1 })
      .lean<IComment[]>();

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error in comments GET endpoint:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching comments" },
      { status: 500 },
    );
  }
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
    const lead = await Lead.findOne({ _id: leadObjectId, adminId })
      .select({ _id: 1 })
      .lean();
    if (!lead) {
      return NextResponse.json(
        { message: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

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

    try {
      await publishLeadUpdatedEvent(adminId.toString(), id, {
        type: "comment_created",
        leadId: id,
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

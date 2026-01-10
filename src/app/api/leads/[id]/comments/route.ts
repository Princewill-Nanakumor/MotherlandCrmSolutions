// app/api/leads/[id]/comments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Comment, { IComment } from "@/models/Comment";

function extractLeadIdFromUrl(urlString: string): string {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  return parts[parts.length - 2];
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

// Utility function to determine correct adminId based on user role
function getCorrectAdminId(session: Session): mongoose.Types.ObjectId {
  if (session.user.role === "ADMIN") {
    return new mongoose.Types.ObjectId(session.user.id);
  } else if (session.user.role === "AGENT" && session.user.adminId) {
    return new mongoose.Types.ObjectId(session.user.adminId);
  }
  throw new Error("Invalid user role or missing adminId for agent");
}

export async function GET(request: Request) {
  try {
    const id = extractLeadIdFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const leadObjectId = new mongoose.Types.ObjectId(id);
    const adminId = getCorrectAdminId(session);

    // Build query that handles both old comments (without adminId) and new comments (with adminId)
    const query: {
      leadId: mongoose.Types.ObjectId;
      $or: Array<
        { adminId?: mongoose.Types.ObjectId } | { adminId: { $exists: false } }
      >;
    } = {
      leadId: leadObjectId,
      $or: [{ adminId: adminId }, { adminId: { $exists: false } }],
    };

    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .lean<IComment[]>();

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error in comments GET endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching comments",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const id = extractLeadIdFromUrl(request.url);
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
    const leadObjectId = new mongoose.Types.ObjectId(id);
    const adminId = getCorrectAdminId(session);

    console.log("=== COMMENTS POST REQUEST ===");
    console.log("Lead ID:", id);
    console.log("User ID:", session.user.id);
    console.log("User Role:", session.user.role);
    console.log("Admin ID:", adminId.toString());
    console.log("Session adminId:", session.user.adminId);
    console.log("Content:", content);

    // Verify the lead exists and belongs to the user's admin
    const Lead = mongoose.models.Lead;
    if (Lead) {
      const leadQuery: {
        _id: mongoose.Types.ObjectId;
        adminId: mongoose.Types.ObjectId;
      } = {
        _id: leadObjectId,
        adminId: adminId,
      };

      console.log("Lead query:", JSON.stringify(leadQuery, null, 2));

      const lead = await Lead.findOne(leadQuery);
      if (!lead) {
        console.log("Lead not found with query:", leadQuery);
        return NextResponse.json(
          { message: "Lead not found or not authorized" },
          { status: 404 }
        );
      }
      console.log("Lead found:", lead._id.toString());
    }

    const comment = new Comment({
      leadId: leadObjectId,
      content: content.trim(),
      adminId: adminId, // Use consistent adminId
      createdBy: {
        _id: session.user.id,
        firstName: session.user.firstName || "",
        lastName: session.user.lastName || "",
      },
    });

    console.log("Saving comment with data:", JSON.stringify(comment, null, 2));

    const savedComment = await comment.save();
    console.log("Comment saved successfully:", savedComment._id.toString());

    // Don't create activity log for comments - they are displayed directly in the comments section
    // Activities should only log non-comment actions like status changes, assignments, etc.

    return NextResponse.json(savedComment);
  } catch (error) {
    console.error("Error in comments POST endpoint:", error);
    return NextResponse.json(
      { message: "Error creating comment" },
      { status: 500 }
    );
  }
}

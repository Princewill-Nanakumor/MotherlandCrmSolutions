// app/api/leads/[id]/activities/[activityId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import Activity from "@/models/Activity";
import mongoose from "mongoose";

function extractParamsFromUrl(urlString: string): {
  id: string;
  activityId: string;
} {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  const activityId = parts[parts.length - 1];
  const id = parts[parts.length - 3];
  return { id, activityId };
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

function getCorrectAdminId(session: Session): mongoose.Types.ObjectId {
  if (session.user.role === "ADMIN") {
    return new mongoose.Types.ObjectId(session.user.id);
  }
  if (session.user.role === "AGENT" && session.user.adminId) {
    return new mongoose.Types.ObjectId(session.user.adminId);
  }
  throw new Error("Invalid user role or missing adminId for agent");
}

export async function DELETE(request: Request) {
  try {
    const { id: leadId, activityId } = extractParamsFromUrl(request.url);
    const session = (await getServerSession(authOptions)) as Session | null;

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const adminId = getCorrectAdminId(session);

    const query: {
      _id: string;
      leadId: string;
      $or: Array<
        { adminId?: mongoose.Types.ObjectId } | { adminId: { $exists: false } }
      >;
    } = {
      _id: activityId,
      leadId,
      $or: [
        { adminId },
        { adminId: { $exists: false } },
      ],
    };

    const deleted = await Activity.findOneAndDelete(query);

    if (!deleted) {
      return NextResponse.json(
        { message: "Activity not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      { message: "Error deleting activity" },
      { status: 500 }
    );
  }
}

// src/app/api/calls/user/[userId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import CallLog from "@/models/CallLog";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can view call logs of other users
    // Users can view their own call logs
    const isAdmin = session.user.role === "ADMIN";
    const { userId: requestedUserId } = await params;

    if (!isAdmin && session.user.id !== requestedUserId) {
      return NextResponse.json(
        { error: "Forbidden - You can only view your own call logs" },
        { status: 403 }
      );
    }

    // Validate userId format
    if (!mongoose.Types.ObjectId.isValid(requestedUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Get call logs for the user, sorted by most recent first
    // Only return logs from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const callLogs = await CallLog.find({
      userId: new mongoose.Types.ObjectId(requestedUserId),
      createdAt: { $gte: threeDaysAgo },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "leadId",
        select: "firstName lastName leadId",
        model: "Lead",
      })
      .lean();

    // Format the response
    interface PopulatedLead {
      _id: mongoose.Types.ObjectId;
      firstName?: string;
      lastName?: string;
      leadId?: number;
    }

    interface CallLogDoc {
      _id: mongoose.Types.ObjectId;
      userId: mongoose.Types.ObjectId;
      leadId?: PopulatedLead | mongoose.Types.ObjectId;
      phoneNumber: string;
      dialer: string;
      createdAt: Date;
    }

    const formattedLogs = callLogs.map((log: CallLogDoc) => {
      const lead = log.leadId && typeof log.leadId === "object" && "_id" in log.leadId && "firstName" in log.leadId
        ? log.leadId as PopulatedLead
        : null;

      return {
        id: log._id.toString(),
        userId: log.userId.toString(),
        leadId: lead ? lead._id.toString() : null,
        leadName: lead
          ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown Lead"
          : null,
        leadDisplayId: lead?.leadId || null,
        phoneNumber: log.phoneNumber,
        dialer: log.dialer,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json(
      {
        success: true,
        callLogs: formattedLogs,
        count: formattedLogs.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching call logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch call logs" },
      { status: 500 }
    );
  }
}

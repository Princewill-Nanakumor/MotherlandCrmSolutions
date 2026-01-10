// src/app/api/calls/log/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import CallLog from "@/models/CallLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { leadId, phoneNumber, dialer } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Create call log entry
    const callLog = await CallLog.create({
      userId: session.user.id,
      leadId: leadId || undefined,
      phoneNumber: phoneNumber.trim(),
      dialer: dialer || "unknown",
    });

    return NextResponse.json(
      {
        success: true,
        callLog: {
          id: callLog._id.toString(),
          userId: callLog.userId.toString(),
          leadId: callLog.leadId?.toString(),
          phoneNumber: callLog.phoneNumber,
          dialer: callLog.dialer,
          createdAt: callLog.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error logging call:", error);
    return NextResponse.json(
      { error: "Failed to log call" },
      { status: 500 }
    );
  }
}

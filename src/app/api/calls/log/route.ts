// src/app/api/calls/log/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import CallLog from "@/models/CallLog";
import Activity from "@/models/Activity";
import Lead from "@/models/Lead";
import {
  publishAdminLeadsUpdatedEvent,
  publishCallLogCreatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { leadId, phoneNumber, dialer } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const trimmedPhone = String(phoneNumber).trim();
    const dialerValue = dialer || "unknown";

    const callLog = await CallLog.create({
      userId: session.user.id,
      leadId: leadId || undefined,
      phoneNumber: trimmedPhone,
      dialer: dialerValue,
    });

    const adminScope = await withAdminScope(session, async (adminId) => adminId);
    let activityId: string | undefined;

    if (adminScope) {
      await publishCallLogCreatedEvent(adminScope, session.user.id, {
        callLogId: callLog._id.toString(),
        userId: session.user.id,
      });

      const validLeadId =
        typeof leadId === "string" &&
        mongoose.Types.ObjectId.isValid(leadId)
          ? leadId
          : null;

      if (validLeadId) {
        const lead = await Lead.findOne({
          _id: new mongoose.Types.ObjectId(validLeadId),
          adminId: new mongoose.Types.ObjectId(adminScope),
        })
          .select("_id")
          .lean();

        if (lead) {
          const activityAt = new Date();
          const performedBy = {
            id: session.user.id,
            firstName: session.user.firstName ?? "",
            lastName: session.user.lastName ?? "",
          };

          try {
            const activity = await Activity.create({
              type: "CALL_INITIATED",
              userId: new mongoose.Types.ObjectId(session.user.id),
              details: "Initiated a call",
              leadId: new mongoose.Types.ObjectId(validLeadId),
              adminId: new mongoose.Types.ObjectId(adminScope),
              timestamp: activityAt,
              metadata: {
                phoneNumber: trimmedPhone,
                dialer: dialerValue,
                performedBy,
              },
            });
            activityId = activity._id.toString();
          } catch (activityError) {
            console.error(
              "Error logging call-initiated activity:",
              activityError,
            );
          }

          await Lead.updateOne(
            {
              _id: new mongoose.Types.ObjectId(validLeadId),
              adminId: new mongoose.Types.ObjectId(adminScope),
            },
            { $set: { lastActivityAt: activityAt, updatedAt: activityAt } },
          );

          try {
            await publishLeadUpdatedEvent(String(adminScope), validLeadId, {
              type: "call_initiated",
              leadId: validLeadId,
              activityId,
            });
            await publishAdminLeadsUpdatedEvent(String(adminScope), {
              type: "call_initiated",
              leadId: validLeadId,
              activityId,
            });
          } catch (publishError) {
            console.error(
              "Failed to publish realtime call-initiated event:",
              publishError,
            );
          }
        }
      }
    }

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
        activityId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error logging call:", error);
    return NextResponse.json(
      { error: "Failed to log call" },
      { status: 500 },
    );
  }
}

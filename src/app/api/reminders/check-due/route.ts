import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Reminder from "@/models/Reminder";
import mongoose from "mongoose";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { isReminderDue } from "@/lib/reminderDueAt";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    await connectMongoDB();

    const now = new Date();
    const { searchParams } = new URL(request.url);

    const userDateParam = searchParams.get("userDate");
    const userTimeParam = searchParams.get("userTime");

    let localContext:
      | {
          currentDateStr: string;
          currentMinutes: number;
          currentSeconds: number;
        }
      | undefined;

    if (userDateParam && userTimeParam) {
      const [h, m, s] = userTimeParam.split(":").map(Number);
      localContext = {
        currentDateStr: userDateParam,
        currentMinutes: (h || 0) * 60 + (m || 0),
        currentSeconds: s || 0,
      };
    }

    const adminId = await withAdminScope(session, async (adminScopeId) => adminScopeId);

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID not found for session user" },
        { status: 400 },
      );
    }

    const allReminders = await Reminder.find({
      adminId: new mongoose.Types.ObjectId(adminId),
      assignedTo: new mongoose.Types.ObjectId(session.user.id),
      status: { $in: ["PENDING", "SNOOZED"] },
    })
      .populate("leadId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName")
      .populate("createdBy", "firstName lastName");

    const dueReminders = allReminders
      .filter((reminder) =>
        isReminderDue(
          {
            status: reminder.status,
            dueAt: reminder.dueAt,
            reminderDate: reminder.reminderDate,
            reminderTime: reminder.reminderTime,
            snoozedUntil: reminder.snoozedUntil,
            timezone: reminder.timezone,
          },
          now,
          localContext,
        ),
      )
      .slice(0, 10);

    return NextResponse.json(dueReminders);
  } catch (error) {
    console.error("Error checking due reminders:", error);
    return NextResponse.json(
      { error: "Failed to check due reminders" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Reminder from "@/models/Reminder";
import mongoose from "mongoose";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { isReminderDue } from "@/lib/reminderDueAt";

const RESULT_LIMIT = 10;
/** Cap legacy in-memory scan until dueAt backfill reaches zero. */
const LEGACY_SCAN_CAP = 100;

const POPULATE = [
  { path: "leadId", select: "firstName lastName email" },
  { path: "assignedTo", select: "firstName lastName" },
  { path: "createdBy", select: "firstName lastName" },
];

function reminderSortKey(reminder: {
  status?: string;
  dueAt?: Date | null;
  snoozedUntil?: Date | null;
  reminderDate?: Date;
}): number {
  if (reminder.status === "SNOOZED" && reminder.snoozedUntil) {
    return new Date(reminder.snoozedUntil).getTime();
  }
  if (reminder.dueAt) return new Date(reminder.dueAt).getTime();
  if (reminder.reminderDate) return new Date(reminder.reminderDate).getTime();
  return 0;
}

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

    const scope = {
      adminId: new mongoose.Types.ObjectId(adminId),
      assignedTo: new mongoose.Types.ObjectId(session.user.id),
    };

    // Separate indexed paths — do not load all open reminders for the user.
    // Legacy path remains until dueAt backfill is complete (then remove it).
    const [pendingDue, snoozedDue, legacyCandidates] = await Promise.all([
      Reminder.find({
        ...scope,
        status: "PENDING",
        dueAt: { $lte: now },
      })
        .sort({ dueAt: 1 })
        .limit(RESULT_LIMIT)
        .populate(POPULATE),
      Reminder.find({
        ...scope,
        status: "SNOOZED",
        snoozedUntil: { $lte: now },
      })
        .sort({ snoozedUntil: 1 })
        .limit(RESULT_LIMIT)
        .populate(POPULATE),
      Reminder.find({
        ...scope,
        status: "PENDING",
        $or: [{ dueAt: { $exists: false } }, { dueAt: null }],
      })
        .sort({ reminderDate: 1, reminderTime: 1 })
        .limit(LEGACY_SCAN_CAP)
        .populate(POPULATE),
    ]);

    const legacyDue = legacyCandidates.filter((reminder) =>
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
    );

    const byId = new Map<string, (typeof pendingDue)[number]>();
    for (const reminder of [...pendingDue, ...snoozedDue, ...legacyDue]) {
      byId.set(String(reminder._id), reminder);
    }

    const dueReminders = Array.from(byId.values())
      .sort((a, b) => reminderSortKey(a) - reminderSortKey(b))
      .slice(0, RESULT_LIMIT);

    return NextResponse.json(dueReminders);
  } catch (error) {
    console.error("Error checking due reminders:", error);
    return NextResponse.json(
      { error: "Failed to check due reminders" },
      { status: 500 },
    );
  }
}

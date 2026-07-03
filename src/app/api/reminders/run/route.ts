import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import Reminder from "@/models/Reminder";
import { publishReminderDueEvent } from "@/libs/ablyServer";
import { isReminderDue } from "@/lib/reminderDueAt";

type ReminderLean = {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  reminderDate: Date;
  reminderTime: string;
  dueAt?: Date;
  timezone?: string;
  type: "CALL" | "EMAIL" | "TASK" | "MEETING";
  status: "PENDING" | "COMPLETED" | "SNOOZED" | "DISMISSED";
  leadId:
    | mongoose.Types.ObjectId
    | { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string; email?: string };
  assignedTo:
    | mongoose.Types.ObjectId
    | { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string };
  adminId: mongoose.Types.ObjectId;
  snoozedUntil?: Date;
  soundEnabled: boolean;
};

function resolveObjectId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const nested = (value as { _id?: mongoose.Types.ObjectId })._id;
    return nested ? String(nested) : null;
  }
  return String(value);
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret;
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const now = new Date();

    const candidates = (await Reminder.find({
      status: { $in: ["PENDING", "SNOOZED"] },
      notificationSent: false,
    })
      .select(
        "_id title description reminderDate reminderTime dueAt timezone type status leadId assignedTo adminId snoozedUntil soundEnabled",
      )
      .populate("leadId", "firstName lastName email")
      .populate("assignedTo", "firstName lastName")
      .lean()) as unknown as ReminderLean[];

    const dueReminders = candidates.filter((r) =>
      isReminderDue(
        {
          status: r.status,
          dueAt: r.dueAt,
          reminderDate: r.reminderDate,
          reminderTime: r.reminderTime,
          snoozedUntil: r.snoozedUntil,
          timezone: r.timezone,
        },
        now,
      ),
    );

    if (dueReminders.length === 0) {
      return NextResponse.json({ ok: true, scanned: candidates.length, sent: 0 });
    }

    let sent = 0;
    const publishedReminderIds: mongoose.Types.ObjectId[] = [];

    for (const reminder of dueReminders) {
      const adminId = resolveObjectId(reminder.adminId);
      const assignedToId = resolveObjectId(reminder.assignedTo);
      const leadObjRaw =
        typeof reminder.leadId === "object" &&
        reminder.leadId !== null &&
        "_id" in reminder.leadId
          ? reminder.leadId
          : null;
      const leadObj = leadObjRaw as
        | {
            _id: mongoose.Types.ObjectId;
            firstName?: string;
            lastName?: string;
            email?: string;
          }
        | null;

      if (!adminId || !assignedToId) continue;

      await publishReminderDueEvent(adminId, assignedToId, {
        reminderId: String(reminder._id),
        title: reminder.title,
        description: reminder.description ?? "",
        type: reminder.type,
        reminderTime: reminder.reminderTime,
        reminderDate: reminder.reminderDate,
        soundEnabled: reminder.soundEnabled ?? true,
        lead: leadObj
          ? {
              _id: String(leadObj._id),
              firstName: leadObj.firstName ?? "",
              lastName: leadObj.lastName ?? "",
              email: leadObj.email ?? "",
            }
          : null,
      });

      publishedReminderIds.push(reminder._id);
      sent += 1;
    }

    if (publishedReminderIds.length > 0) {
      await Reminder.updateMany(
        { _id: { $in: publishedReminderIds } },
        { $set: { notificationSent: true } },
      );
    }

    return NextResponse.json({
      ok: true,
      scanned: candidates.length,
      due: dueReminders.length,
      sent,
    });
  } catch (error) {
    console.error("Error running reminders dispatcher:", error);
    return NextResponse.json(
      { error: "Failed to run reminders dispatcher" },
      { status: 500 },
    );
  }
}

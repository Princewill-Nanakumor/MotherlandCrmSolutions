// src/app/api/leads/[id]/reminders/[reminderId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Reminder from "@/models/Reminder";
import Activity, { type ActivityType, type IActivity } from "@/models/Activity";
import Lead from "@/models/Lead";
import mongoose from "mongoose";
import { singleLeadAccessFilter } from "@/lib/leadAssignmentQuery";
import {
  publishAdminLeadsUpdatedEvent,
  publishLeadUpdatedEvent,
} from "@/libs/ablyServer";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";
import { computeReminderDueAt, reminderDateToYmd } from "@/lib/reminderDueAt";
import { canAccessAllLeads, canManageReminders } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";
import {
  sessionPerfMark,
  withSessionPerf,
} from "@/lib/sessionPerfProbe";
import { withMongoPerf } from "@/lib/mongoPerfProbe";

type ReminderDeleteLean = {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  type: string;
  reminderDate: Date;
  reminderTime: string;
};

// PUT - Update reminder (complete, snooze, edit)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    await connectMongoDB();
    const { reminderId, id } = await params;
    const body = await request.json();

    // Get adminId to ensure we're working within the same organization
    const adminId = await withAdminScope(session, async (adminScopeId) => adminScopeId);

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID not found" },
        { status: 400 }
      );
    }

    const reminder = await Reminder.findOne({
      _id: reminderId,
      adminId: adminId, // Ensure reminder belongs to the same organization
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    const reminderLeadId = String(reminder.leadId);
    if (reminderLeadId !== id) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
    }

    const leadAccess = await Lead.findOne(
      singleLeadAccessFilter(
        new mongoose.Types.ObjectId(id),
        new mongoose.Types.ObjectId(adminId),
        session.user.role,
        session.user.id,
        canAccessAllLeads(session.user),
      ),
    )
      .select({ _id: 1 })
      .lean();
    if (!leadAccess) {
      return NextResponse.json(
        { error: "Lead not found or not authorized" },
        { status: 404 },
      );
    }

    if (!canManageReminders(session.user)) {
      const uid = session.user.id;
      const createdByStr = reminder.createdBy
        ? String(reminder.createdBy)
        : "";
      const assignedToStr = reminder.assignedTo
        ? String(reminder.assignedTo)
        : "";
      if (createdByStr !== uid && assignedToStr !== uid) {
        return forbiddenResponse(
          "You can only update reminders you created or that are assigned to you",
        );
      }
    }

    const oldStatus = reminder.status;
    const oldTitle = reminder.title;

    // Handle different update types
    if (body.status === "COMPLETED") {
      reminder.status = "COMPLETED";
      reminder.completedAt = new Date();
    } else if (body.status === "SNOOZED" && body.snoozedUntil) {
      reminder.status = "SNOOZED";
      reminder.snoozedUntil = new Date(body.snoozedUntil);
      reminder.notificationSent = false;
    } else if (body.status === "DISMISSED") {
      reminder.status = "DISMISSED";
    } else {
      // Regular update - check if time/date changed
      const timeOrDateChanged =
        (body.reminderDate &&
          new Date(body.reminderDate).getTime() !==
            reminder.reminderDate.getTime()) ||
        (body.reminderTime && body.reminderTime !== reminder.reminderTime);

      if (body.title) reminder.title = body.title;
      if (body.description !== undefined)
        reminder.description = body.description;
      if (body.reminderDate) {
        const dateYmd =
          typeof body.reminderDate === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(body.reminderDate)
            ? body.reminderDate
            : new Date(body.reminderDate).toISOString().split("T")[0];
        reminder.reminderDate = new Date(`${dateYmd}T00:00:00.000Z`);
      }
      if (body.reminderTime) reminder.reminderTime = body.reminderTime;
      if (body.type) reminder.type = body.type;
      if (body.soundEnabled !== undefined)
        reminder.soundEnabled = body.soundEnabled;
      if (typeof body.timezone === "string" && body.timezone.trim()) {
        reminder.timezone = body.timezone.trim();
      }

      // Reset notification and status if time/date changed
      if (timeOrDateChanged) {
        reminder.notificationSent = false;
        reminder.status = "PENDING";
        reminder.snoozedUntil = undefined;
        reminder.completedAt = undefined;
      }

      const tz = reminder.timezone || "UTC";
      const dateYmd = reminderDateToYmd(reminder.reminderDate);
      reminder.dueAt = computeReminderDueAt(
        dateYmd,
        reminder.reminderTime,
        tz,
      );
    }

    await reminder.save();

    const updatedReminder = await Reminder.findById(reminder._id)
      .populate("assignedTo", "firstName lastName")
      .populate("createdBy", "firstName lastName");

    // Create activity log based on the type of update
    try {
      let activityType: ActivityType;
      let activityDetails: string;
      const metadata: Partial<IActivity["metadata"]> = {
        reminderId: reminder._id.toString(),
        reminderTitle: reminder.title,
        reminderType: reminder.type,
        reminderStatus: reminder.status,
        oldReminderStatus: oldStatus,
        performedBy: {
          id: session.user.id,
          firstName: session.user.firstName ?? "",
          lastName: session.user.lastName ?? "",
        },
      };

      if (body.status === "COMPLETED") {
        activityType = "REMINDER_COMPLETED";
        activityDetails = `Marked reminder as completed: ${reminder.title}`;
        metadata.completedAt = reminder.completedAt?.toISOString();
      } else if (body.status === "SNOOZED" && body.snoozedUntil) {
        activityType = "REMINDER_SNOOZED";
        activityDetails = `Snoozed reminder until ${new Date(body.snoozedUntil).toLocaleString()}: ${reminder.title}`;
        metadata.snoozedUntil = reminder.snoozedUntil?.toISOString();
      } else if (body.status === "DISMISSED") {
        activityType = "REMINDER_DISMISSED";
        activityDetails = `Dismissed reminder: ${reminder.title}`;
      } else if (body.soundEnabled !== undefined) {
        // Handle mute/unmute
        activityType = body.soundEnabled
          ? "REMINDER_UNMUTED"
          : "REMINDER_MUTED";
        activityDetails = `${body.soundEnabled ? "Unmuted" : "Muted"} reminder: ${reminder.title}`;
        metadata.soundEnabled = body.soundEnabled;
      } else {
        // Regular update
        activityType = "REMINDER_UPDATED";
        activityDetails = `Updated reminder: ${reminder.title}`;

        // Check if time/date changed
        const timeOrDateChanged =
          (body.reminderDate &&
            new Date(body.reminderDate).getTime() !==
              reminder.reminderDate.getTime()) ||
          (body.reminderTime && body.reminderTime !== reminder.reminderTime);

        if (timeOrDateChanged) {
          metadata.reminderDate = reminder.reminderDate.toISOString();
          metadata.reminderTime = reminder.reminderTime;
          activityDetails += ` (date/time changed)`;
        }

        if (body.title && body.title !== oldTitle) {
          activityDetails += ` (title changed)`;
        }
      }

      const activityAt = new Date();
      await Activity.create({
        type: activityType,
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: activityDetails,
        leadId: new mongoose.Types.ObjectId(id),
        adminId: new mongoose.Types.ObjectId(adminId),
        timestamp: activityAt,
        metadata,
      });
      await Lead.updateOne(
        {
          _id: new mongoose.Types.ObjectId(id),
          adminId: new mongoose.Types.ObjectId(adminId),
        },
        { $set: { lastActivityAt: activityAt, updatedAt: activityAt } },
      );
    } catch (activityError) {
      console.error("Error logging reminder update activity:", activityError);
      // Don't fail the request if activity logging fails
    }

    try {
      await publishLeadUpdatedEvent(String(adminId), id, {
        type: "reminder_updated",
        leadId: id,
        reminderId: reminder._id.toString(),
      });
      await publishAdminLeadsUpdatedEvent(String(adminId), {
        type: "reminder_updated",
        leadId: id,
        reminderId: reminder._id.toString(),
      });
    } catch (publishError) {
      console.error("Failed to publish realtime reminder update event:", publishError);
    }

    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
  }
}

// DELETE - Delete reminder
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; reminderId: string }> }
) {
  const wallStart = Date.now();
  const [response] = await withMongoPerf(async () => {
    const perf = new ApiRoutePerf("DELETE /api/leads/[id]/reminders/[reminderId]");
    try {
      const [session, sessionProbe] = await withSessionPerf(async () => {
        sessionPerfMark("getServerSessionEnter");
        const s = await getServerSession(authOptions);
        sessionPerfMark("getServerSessionExit");
        return s;
      });
      perf.mark("getServerSession");
      if (!session) {
        perf.finish({ status: 401 });
        return unauthorizedResponse();
      }

      await connectMongoDB();
      perf.mark("connectMongoDB");
      const { reminderId, id } = await params;

      const adminId = await withAdminScope(session, async (adminScopeId) => adminScopeId);
      perf.mark("adminScope");

      if (!adminId) {
        perf.finish({ status: 400 });
        return NextResponse.json(
          { error: "Admin ID not found" },
          { status: 400 }
        );
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        perf.finish({ status: 400 });
        return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
      }

      const leadObjectId = new mongoose.Types.ObjectId(id);
      const adminObjectId = new mongoose.Types.ObjectId(adminId);

      const [reminder, delLeadAccess] = await Promise.all([
        Reminder.findOne({ _id: reminderId, adminId }).lean<ReminderDeleteLean>(),
        Lead.findOne(
          singleLeadAccessFilter(
            leadObjectId,
            adminObjectId,
            session.user.role,
            session.user.id,
            canAccessAllLeads(session.user),
          ),
        )
          .select({ _id: 1 })
          .lean(),
      ]);
      perf.mark("loadReminderAndLead");

      if (!reminder) {
        perf.finish({ status: 404 });
        return NextResponse.json(
          {
            error: "Reminder not found or you don't have permission to delete it",
          },
          { status: 404 },
        );
      }

      if (String(reminder.leadId) !== id || !delLeadAccess) {
        perf.finish({ status: 404 });
        return NextResponse.json(
          { error: "Reminder not found" },
          { status: 404 },
        );
      }

      const canManageAllReminders = canManageReminders(session.user);

      if (reminder.status === "COMPLETED" && !canManageAllReminders) {
        perf.finish({ status: 403 });
        return NextResponse.json(
          {
            error: "You do not have permission to delete completed reminders",
          },
          { status: 403 }
        );
      }

      if (
        reminder.status !== "COMPLETED" &&
        !canManageAllReminders &&
        String(reminder.createdBy) !== session.user.id
      ) {
        perf.finish({ status: 403 });
        return NextResponse.json(
          { error: "You can only delete reminders you created" },
          { status: 403 },
        );
      }

      const deleteQuery: {
        _id: string;
        adminId: string;
        createdBy?: string;
      } = {
        _id: reminderId,
        adminId: adminId,
      };

      if (reminder.status !== "COMPLETED" && !canManageAllReminders) {
        deleteQuery.createdBy = session.user.id;
      }

      await Reminder.findOneAndDelete(deleteQuery);
      perf.mark("deleteReminder");

      const activityAt = new Date();
      try {
        await Promise.all([
          Activity.create({
            type: "REMINDER_DELETED",
            userId: new mongoose.Types.ObjectId(session.user.id),
            details: `Deleted reminder: ${reminder.title}`,
            leadId: leadObjectId,
            adminId: adminObjectId,
            timestamp: activityAt,
            metadata: {
              reminderId: String(reminder._id),
              reminderTitle: reminder.title,
              reminderType: reminder.type,
              reminderStatus: reminder.status,
              reminderDate: new Date(reminder.reminderDate).toISOString(),
              reminderTime: reminder.reminderTime,
              performedBy: {
                id: session.user.id,
                firstName: session.user.firstName ?? "",
                lastName: session.user.lastName ?? "",
              },
            },
          }),
          Lead.updateOne(
            { _id: leadObjectId, adminId: adminObjectId },
            { $set: { lastActivityAt: activityAt, updatedAt: activityAt } },
          ),
        ]);
        perf.mark("activityAndLeadTouch");
      } catch (activityError) {
        console.error("Error logging reminder deletion activity:", activityError);
      }

      void publishAdminLeadsUpdatedEvent(String(adminId), {
        type: "reminder_deleted",
        leadId: id,
        reminderId: String(reminder._id),
      }).catch((publishError) => {
        console.error("Failed to publish realtime reminder delete event:", publishError);
      });
      perf.mark("publishAblyQueued");

      return apiPerfJsonResponse(
        perf,
        { message: "Reminder deleted successfully" },
        {
          sessionProbe,
          wallMs: Date.now() - wallStart,
        },
      );
    } catch (error) {
      console.error("Error deleting reminder:", error);
      perf.finish({ error: true, wallMs: Date.now() - wallStart });
      return NextResponse.json(
        { error: "Failed to delete reminder" },
        { status: 500 }
      );
    }
  });
  return response;
}

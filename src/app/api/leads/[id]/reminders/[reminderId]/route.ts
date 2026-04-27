// src/app/api/leads/[id]/reminders/[reminderId]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Reminder from "@/models/Reminder";
import Activity, { type ActivityType, type IActivity } from "@/models/Activity";
import mongoose from "mongoose";
import { publishLeadUpdatedEvent } from "@/libs/ablyServer";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { withAdminScope } from "@/lib/withAdminScope";

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
      if (body.reminderDate)
        reminder.reminderDate = new Date(body.reminderDate);
      if (body.reminderTime) reminder.reminderTime = body.reminderTime;
      if (body.type) reminder.type = body.type;
      if (body.soundEnabled !== undefined)
        reminder.soundEnabled = body.soundEnabled;

      // Reset notification and status if time/date changed
      if (timeOrDateChanged) {
        reminder.notificationSent = false;
        reminder.status = "PENDING";
        reminder.snoozedUntil = undefined;
        reminder.completedAt = undefined;
      }
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

      await Activity.create({
        type: activityType,
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: activityDetails,
        leadId: new mongoose.Types.ObjectId(id),
        adminId: new mongoose.Types.ObjectId(adminId),
        timestamp: new Date(),
        metadata,
      });
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
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return unauthorizedResponse();
    }

    await connectMongoDB();
    const { reminderId, id } = await params;

    // Get adminId to ensure we're working within the same organization
    const adminId = await withAdminScope(session, async (adminScopeId) => adminScopeId);

    if (!adminId) {
      return NextResponse.json(
        { error: "Admin ID not found" },
        { status: 400 }
      );
    }

    // Get the reminder before deleting it for activity logging
    // Users can only delete reminders they created (unless they're admin)
    // Completed reminders can only be deleted by admins
    const reminder = await Reminder.findOne({
      _id: reminderId,
      adminId: adminId, // Ensure reminder belongs to the same organization
    });

    if (
      reminder &&
      reminder.status === "COMPLETED" &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "Only administrators can delete completed reminders",
        },
        { status: 403 }
      );
    }

    // For non-completed reminders, non-admins can only delete their own
    if (
      reminder &&
      reminder.status !== "COMPLETED" &&
      session.user.role !== "ADMIN"
    ) {
      const ownReminder = await Reminder.findOne({
        _id: reminderId,
        adminId: adminId,
        createdBy: session.user.id,
      });

      if (!ownReminder) {
        return NextResponse.json(
          {
            error: "You can only delete reminders you created",
          },
          { status: 403 }
        );
      }
    }

    if (!reminder) {
      return NextResponse.json(
        {
          error: "Reminder not found or you don't have permission to delete it",
        },
        { status: 404 }
      );
    }

    // Delete the reminder based on the permission logic above
    const deleteQuery: {
      _id: string;
      adminId: string;
      createdBy?: string;
    } = {
      _id: reminderId,
      adminId: adminId,
    };

    // For non-completed reminders, non-admins can only delete their own
    if (reminder.status !== "COMPLETED" && session.user.role !== "ADMIN") {
      deleteQuery.createdBy = session.user.id;
    }

    await Reminder.findOneAndDelete(deleteQuery);

    // Create activity log for reminder deletion
    try {
      await Activity.create({
        type: "REMINDER_DELETED",
        userId: new mongoose.Types.ObjectId(session.user.id),
        details: `Deleted reminder: ${reminder.title}`,
        leadId: new mongoose.Types.ObjectId(id),
        adminId: new mongoose.Types.ObjectId(adminId),
        timestamp: new Date(),
        metadata: {
          reminderId: reminder._id.toString(),
          reminderTitle: reminder.title,
          reminderType: reminder.type,
          reminderStatus: reminder.status,
          reminderDate: reminder.reminderDate.toISOString(),
          reminderTime: reminder.reminderTime,
        },
      });
    } catch (activityError) {
      console.error("Error logging reminder deletion activity:", activityError);
      // Don't fail the request if activity logging fails
    }

    try {
      await publishLeadUpdatedEvent(String(adminId), id, {
        type: "reminder_deleted",
        leadId: id,
        reminderId: reminder._id.toString(),
      });
    } catch (publishError) {
      console.error("Failed to publish realtime reminder delete event:", publishError);
    }

    return NextResponse.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}

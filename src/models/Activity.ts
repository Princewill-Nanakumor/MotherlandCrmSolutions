// Update your existing Activity model to include user-specific activities
import mongoose from "mongoose";

export type ActivityType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "IMPORT"
  | "STATUS_CHANGE"
  | "ASSIGNMENT"
  | "COMMENT"
  | "LEAD_CREATED"
  // Add user-specific activity types
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_UPDATED"
  | "SUBSCRIPTION_CANCELLED"
  | "PROFILE_UPDATED"
  | "PASSWORD_CHANGED"
  | "PERMISSION_CHANGED"
  // Add reminder-specific activity types
  | "REMINDER_CREATED"
  | "REMINDER_UPDATED"
  | "REMINDER_DELETED"
  | "REMINDER_COMPLETED"
  | "REMINDER_SNOOZED"
  | "REMINDER_DISMISSED"
  | "REMINDER_MUTED"
  | "REMINDER_UNMUTED"
  // Add call-specific activity types
  | "CALL_INITIATED"
  | "CALL_CONNECTED"
  | "CALL_ENDED"
  | "CALL_FAILED"
  | "CALL_MISSED";

export interface IActivity {
  type: ActivityType;
  userId: mongoose.Types.ObjectId;
  details: string;
  timestamp: Date;
  leadId?: mongoose.Types.ObjectId;
  adminId?: mongoose.Types.ObjectId;
  metadata: {
    contactId?: string;
    email?: string;
    count?: number;
    source?: string;
    oldValue?: string;
    newValue?: string;
    status?: string;
    oldStatus?: string;
    newStatus?: string;
    oldStatusId?: string;
    newStatusId?: string;
    assignedTo?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    assignedFrom?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    assignedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    performedBy?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    commentContent?: string;
    oldCommentContent?: string;
    changes?: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }>;
    // Add user-specific metadata
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    targetUserId?: string; // For admin actions on other users
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    permissionChanges?: Array<{
      permission: string;
      granted: boolean;
    }>;
    // Reminder-specific metadata
    reminderId?: string;
    reminderTitle?: string;
    reminderType?: string;
    reminderDate?: string;
    reminderTime?: string;
    reminderStatus?: string;
    oldReminderStatus?: string;
    snoozedUntil?: string;
    completedAt?: string;
    soundEnabled?: boolean;
    // Call-specific metadata
    phoneNumber?: string;
    callDuration?: number; // Duration in seconds
    callStartTime?: string;
    callEndTime?: string;
    callStatus?: "connected" | "missed" | "busy" | "failed" | "cancelled";
  };
}

export interface IActivityDocument extends IActivity, mongoose.Document {}

const activitySchema = new mongoose.Schema<IActivityDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "IMPORT",
        "STATUS_CHANGE",
        "ASSIGNMENT",
        "COMMENT",
        "LEAD_CREATED",
        "USER_LOGIN",
        "USER_LOGOUT",
        "USER_CREATED",
        "USER_UPDATED",
        "USER_DELETED",
        "SUBSCRIPTION_CREATED",
        "SUBSCRIPTION_UPDATED",
        "SUBSCRIPTION_CANCELLED",
        "PROFILE_UPDATED",
        "PASSWORD_CHANGED",
        "PERMISSION_CHANGED",
        "REMINDER_CREATED",
        "REMINDER_UPDATED",
        "REMINDER_DELETED",
        "REMINDER_COMPLETED",
        "REMINDER_SNOOZED",
        "REMINDER_DISMISSED",
        "REMINDER_MUTED",
        "REMINDER_UNMUTED",
        "CALL_INITIATED",
        "CALL_CONNECTED",
        "CALL_ENDED",
        "CALL_FAILED",
        "CALL_MISSED",
      ],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lead",
      required: false,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      // Index is created via compound indexes below
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Existing indexes
activitySchema.index({ leadId: 1, timestamp: -1 });
activitySchema.index({ userId: 1 });
activitySchema.index({ type: 1 });
activitySchema.index({ "metadata.oldStatusId": 1 });
activitySchema.index({ "metadata.newStatusId": 1 });
activitySchema.index({ leadId: 1, adminId: 1 });
activitySchema.index({ adminId: 1, timestamp: -1 });

// Add new indexes for user activities
activitySchema.index({ type: 1, adminId: 1, timestamp: -1 }); // For filtering user activities by admin
activitySchema.index({ "metadata.targetUserId": 1 }); // For admin actions on specific users

activitySchema.pre("save", function (this: IActivityDocument, next) {
  if (!this.metadata || typeof this.metadata !== "object") {
    next(new Error("Invalid metadata"));
    return;
  }
  next();
});

const Activity =
  mongoose.models.Activity ||
  mongoose.model<IActivityDocument>("Activity", activitySchema);

export default Activity;

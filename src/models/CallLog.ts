// src/models/CallLog.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ICallLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // User who made the call
  leadId?: mongoose.Types.ObjectId; // Lead/contact that was called (optional)
  phoneNumber: string; // Phone number that was called
  dialer: "microsip" | "zoiper" | "unknown"; // Which dialer was used
  createdAt: Date; // Timestamp of when the call was initiated
  updatedAt: Date;
  __v: number;
}

const callLogSchema = new Schema<ICallLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    dialer: {
      type: String,
      enum: ["microsip", "zoiper", "unknown"],
      default: "unknown",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by user and date
callLogSchema.index({ userId: 1, createdAt: -1 });
callLogSchema.index({ createdAt: 1 }); // For cleanup job
callLogSchema.index({ leadId: 1 }); // For lead-based queries

// Delete existing model to prevent conflicts
if (mongoose.models.CallLog) {
  delete mongoose.models.CallLog;
}

const CallLog = mongoose.model<ICallLog>("CallLog", callLogSchema);

export default CallLog;

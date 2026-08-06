import mongoose, { Schema } from "mongoose";
import { randomUUID } from "crypto";

export interface ILead {
  _id: mongoose.Types.ObjectId;
  leadId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  /** Legacy codes (e.g. NEW) or tenant Status document ObjectId string */
  status: string;
  source: string;
  comments: string;
  importId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId | null;
  adminId: mongoose.Types.ObjectId;
  statusChangedAt?: Date;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const leadSchema = new Schema(
  {
    leadId: {
      type: String,
      // sparse and unique are defined in the index below, not here
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    country: {
      required: true,
      type: String,
      trim: true,
      default: "",
    },
    status: {
      // Free string: legacy codes (NEW, …) or custom Status ObjectId strings.
      // Enum removed so create matches status-update (which already stores ObjectIds).
      type: String,
      default: "NEW",
    },
    source: {
      type: String,
      trim: true,
      default: "—",
    },
    comments: {
      type: String,
      default: "No comments yet",
    },
    importId: {
      type: Schema.Types.ObjectId,
      ref: "Import",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    statusChangedAt: {
      type: Date,
      default: null,
    },
    lastActivityAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index for email + adminId to ensure emails are unique per admin
leadSchema.index({ email: 1, adminId: 1 }, { unique: true });
leadSchema.index({ adminId: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ country: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdBy: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ leadId: 1 }, { unique: true, sparse: true });
// Compound indexes for filtered list queries (adminId + filter + sort)
leadSchema.index({ adminId: 1, country: 1, createdAt: -1 });
leadSchema.index({ adminId: 1, source: 1, createdAt: -1 });
leadSchema.index({ adminId: 1, lastActivityAt: -1, updatedAt: -1 });

// Generate collision-resistant public lead ID.
export function generateLeadId(): string {
  return `LD-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

// Pre-save hook: set statusChangedAt when status changes
leadSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.statusChangedAt = new Date();
  }
  next();
});

// Pre-save hook to auto-generate leadId if it doesn't exist
leadSchema.pre("save", async function (next) {
  if (!this.leadId) {
    try {
      this.leadId = await generateLeadId();
    } catch (error) {
      console.error("Error generating leadId:", error);
      // Continue without leadId if generation fails (will be set later)
    }
  }
  next();
});

const Lead = mongoose.models.Lead || mongoose.model<ILead>("Lead", leadSchema);

export default Lead;

import mongoose, { Schema } from "mongoose";

export interface ILead {
  _id: mongoose.Types.ObjectId;
  leadId?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  status: "NEW" | "CONTACTED" | "IN_PROGRESS" | "QUALIFIED" | "LOST" | "WON";
  source: string;
  comments: string;
  importId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId | null;
  adminId: mongoose.Types.ObjectId;
  statusChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const leadSchema = new Schema(
  {
    leadId: {
      type: Number,
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
      type: String,
      enum: ["NEW", "CONTACTED", "IN_PROGRESS", "QUALIFIED", "LOST", "WON"],
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

// Function to generate a unique 5-6 digit leadId
export async function generateLeadId(): Promise<number> {
  const Lead =
    mongoose.models.Lead || mongoose.model<ILead>("Lead", leadSchema);

  let attempts = 0;
  const maxAttempts = 200; // Increased attempts

  while (attempts < maxAttempts) {
    // Generate a random number between 10000 and 999999 (5-6 digits)
    const candidateId =
      Math.floor(Math.random() * (999999 - 10000 + 1)) + 10000;

    // Check if this ID already exists using the database index for better performance
    const existingLead = await Lead.findOne({ leadId: candidateId }).lean();
    if (!existingLead) {
      // Double-check with a count query to ensure uniqueness
      const count = await Lead.countDocuments({ leadId: candidateId });
      if (count === 0) {
        return candidateId;
      }
    }

    attempts++;
  }

  // Fallback: use timestamp-based ID with random component to ensure uniqueness
  const baseTimestamp = Date.now();
  let fallbackId = (baseTimestamp % 900000) + 10000; // Ensure 5-6 digits

  // Check if fallback ID exists, if so add random component
  let fallbackAttempts = 0;
  while (fallbackAttempts < 50) {
    const existing = await Lead.findOne({ leadId: fallbackId }).lean();
    if (!existing) {
      const count = await Lead.countDocuments({ leadId: fallbackId });
      if (count === 0) {
        return fallbackId;
      }
    }
    // Add random component to make it unique
    fallbackId =
      ((baseTimestamp + Math.floor(Math.random() * 1000)) % 900000) + 10000;
    fallbackAttempts++;
  }

  // Last resort: use a combination that's very unlikely to collide
  const lastResortId = Math.floor(Math.random() * (999999 - 10000 + 1)) + 10000;
  return lastResortId;
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

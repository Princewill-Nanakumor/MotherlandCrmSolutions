// src/models/User.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  country: string;
  role: "ADMIN" | "AGENT";
  status: "ACTIVE" | "INACTIVE";
  permissions: string[];
  adminId?: mongoose.Types.ObjectId; // For multi-tenancy - AGENT users have adminId, ADMIN users don't
  createdBy?: mongoose.Types.ObjectId; // For AGENT users, this is their admin
  lastLogin?: Date;

  // Email verification fields
  emailVerified?: boolean;
  verificationToken?: string;
  verificationExpires?: Date;

  // Password reset fields
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;

  // Subscription and billing fields
  balance?: number;
  isOnTrial?: boolean;
  trialEndsAt?: Date;
  currentPlan?: string;
  subscriptionStatus?: "active" | "inactive" | "trial" | "expired";
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  maxLeads?: number;
  maxUsers?: number;
  canViewPhoneNumbers?: boolean; // Whether user can view phone numbers in leads
  canViewEmails?: boolean; // Whether user can view email addresses in leads

  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["ADMIN", "AGENT"],
      default: "AGENT",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    permissions: {
      type: [String],
      default: [],
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastLogin: {
      type: Date,
    },

    // Email verification fields
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    verificationExpires: {
      type: Date,
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },

    // Subscription and billing fields
    balance: {
      type: Number,
      default: 0,
    },
    isOnTrial: {
      type: Boolean,
      default: true,
    },
    trialEndsAt: {
      type: Date,
      default: function () {
        // Set trial to end 3 days from now
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 3);
        return trialEnd;
      },
    },
    currentPlan: {
      type: String,
      enum: ["starter", "professional", "enterprise"],
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trial", "expired"],
      default: "trial",
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    maxLeads: {
      type: Number,
      default: 50, // Default trial limit
    },
    maxUsers: {
      type: Number,
      default: 1, // Default trial limit
    },
    canViewPhoneNumbers: {
      type: Boolean,
      default: false, // Default to false - phone numbers are masked by default
    },
    canViewEmails: {
      type: Boolean,
      default: false, // Default to false - emails are masked by default
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to validate conditional required fields and set trial end date
userSchema.pre("save", function (next) {
  // Set trial end date if it's not already set
  if (!this.trialEndsAt) {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3);
    this.trialEndsAt = trialEnd;
  }

  // Set subscription status to trial if not already set
  if (!this.subscriptionStatus) {
    this.subscriptionStatus = "trial";
  }

  // Set isOnTrial to true if not already set
  if (this.isOnTrial === undefined) {
    this.isOnTrial = true;
  }

  if (this.role === "AGENT") {
    if (!this.adminId) {
      return next(new Error("adminId is required for AGENT users"));
    }
    if (!this.createdBy) {
      return next(new Error("createdBy is required for AGENT users"));
    }
  }
  next();
});

// Indexes for better performance and multi-tenancy
userSchema.index({ email: 1, adminId: 1 }, { unique: true, sparse: true });
userSchema.index(
  { email: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: "ADMIN" } }
);
userSchema.index({ adminId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// Delete existing model to prevent conflicts
if (mongoose.models.User) {
  delete mongoose.models.User;
}

const User = mongoose.model<IUser>("User", userSchema);

export default User;

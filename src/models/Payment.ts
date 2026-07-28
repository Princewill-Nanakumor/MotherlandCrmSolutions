import mongoose, { Schema } from "mongoose";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: "CREDIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "CRYPTO";
  transactionId: string;
  description?: string;
  subscriptionId?: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  /** When the admin confirmed they sent crypto (clicked "I Have Made the Payment"). */
  userConfirmedAt?: Date;
  /** Deadline to confirm the deposit; unpaid requests fail after this. */
  expiresAt?: Date;
  network?: "TRC20" | "ERC20";
  walletAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const paymentSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    method: {
      type: String,
      enum: ["CREDIT_CARD", "PAYPAL", "BANK_TRANSFER", "CRYPTO"],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    userConfirmedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    network: {
      type: String,
      enum: ["TRC20", "ERC20"],
    },
    walletAddress: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance and multi-tenancy
paymentSchema.index({ adminId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdBy: 1 });
paymentSchema.index({ status: 1, expiresAt: 1, userConfirmedAt: 1 });

// Generate unique transaction ID
paymentSchema.pre("save", function (next) {
  if (this.isNew && !this.transactionId) {
    this.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});

const Payment =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;

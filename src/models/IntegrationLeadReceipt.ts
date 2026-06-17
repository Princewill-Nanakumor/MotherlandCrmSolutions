import mongoose, { Schema } from "mongoose";

export interface IIntegrationLeadReceipt {
  _id: mongoose.Types.ObjectId;
  provider: "taboola";
  externalId: string;
  adminId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const integrationLeadReceiptSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["taboola"],
    },
    externalId: {
      type: String,
      required: true,
      trim: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true },
);

integrationLeadReceiptSchema.index(
  { provider: 1, externalId: 1, adminId: 1 },
  { unique: true },
);

const IntegrationLeadReceipt =
  mongoose.models.IntegrationLeadReceipt ||
  mongoose.model<IIntegrationLeadReceipt>(
    "IntegrationLeadReceipt",
    integrationLeadReceiptSchema,
  );

export default IntegrationLeadReceipt;

import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "In Progress", "Qualified", "Lost", "Won"],
      default: "New",
    },
    country: {
      type: String,
      trim: true,
    },
    comments: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Tenant-scoped uniqueness: same email allowed across tenants
contactSchema.index({ email: 1, adminId: 1 }, { unique: true });

// Add indexes for better query performance
contactSchema.index({ status: 1 });
contactSchema.index({ adminId: 1, createdAt: -1 });

contactSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Contact =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);

export default Contact;

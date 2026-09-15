// src/models/Comment.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  leadId: mongoose.Types.ObjectId;
  content: string;
  adminId: mongoose.Types.ObjectId; // Multi-tenancy field
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      required: true,
      // Index is created via compound index below
    },
    createdBy: {
      _id: {
        type: String,
        required: true,
      },
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      avatar: String,
    },
  },
  {
    timestamps: true,
  }
);

// Multi-tenancy + lead timeline sort (GET /api/leads/[id]/comments)
CommentSchema.index({ leadId: 1, adminId: 1 });
CommentSchema.index({ leadId: 1, createdAt: -1 });

const Comment =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;

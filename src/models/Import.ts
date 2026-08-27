import mongoose, { Schema } from "mongoose";

export interface IImport {
  _id: mongoose.Types.ObjectId;
  fileName: string;
  recordCount: number;
  /**
   * staging → client uploading chunks
   * queued → ready for worker
   * processing → worker claimed
   * completed | failed
   */
  status: string;
  successCount: number;
  failureCount: number;
  processedCount: number;
  duplicateCount: number;
  errorCount: number;
  errorMessage?: string | null;
  /** Next staging chunkIndex to process (resume cursor). */
  nextChunkIndex: number;
  chunkTotal: number;
  mode?: string;
  workerClaimedAt?: Date | null;
  workerClaimId?: string | null;
  timestamp: number;
  uploadedBy: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const importSchema = new Schema(
  {
    fileName: { type: String, required: true },
    recordCount: { type: Number, required: true },
    status: { type: String, default: "staging" },
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    nextChunkIndex: { type: Number, default: 0 },
    chunkTotal: { type: Number, default: 0 },
    mode: { type: String, default: "queued" },
    workerClaimedAt: { type: Date, default: null },
    workerClaimId: { type: String, default: null },
    timestamp: { type: Number, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

importSchema.index({ adminId: 1 });
importSchema.index({ uploadedBy: 1 });
importSchema.index({ createdAt: -1 });
importSchema.index({ status: 1, workerClaimedAt: 1 });
importSchema.index({ adminId: 1, status: 1 });

const Import =
  mongoose.models.Import || mongoose.model<IImport>("Import", importSchema);

export default Import;

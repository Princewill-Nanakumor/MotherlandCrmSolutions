import mongoose, { Schema } from "mongoose";

export interface IImportStagingChunk {
  _id: mongoose.Types.ObjectId;
  importId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  chunkIndex: number;
  leads: Record<string, unknown>[];
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const importStagingSchema = new Schema(
  {
    importId: {
      type: Schema.Types.ObjectId,
      ref: "Import",
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chunkIndex: { type: Number, required: true },
    leads: { type: [Schema.Types.Mixed], required: true },
    processed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

importStagingSchema.index(
  { importId: 1, chunkIndex: 1 },
  { unique: true },
);
importStagingSchema.index({ importId: 1, processed: 1, chunkIndex: 1 });

const ImportStagingChunk =
  mongoose.models.ImportStagingChunk ||
  mongoose.model<IImportStagingChunk>(
    "ImportStagingChunk",
    importStagingSchema,
  );

export default ImportStagingChunk;

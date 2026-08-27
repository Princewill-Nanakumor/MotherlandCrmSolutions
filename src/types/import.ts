// src/types/import.ts
import { Types } from "mongoose";

export interface ValidationError {
  type: "MISSING_HEADERS";
  missingFields: string[];
}

export interface ProcessedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  status: string;
  importId?: string;
  source?: string;
}

// Excel file row structure with flexible field names
export interface ExcelRow {
  name?: string;
  "full name"?: string;
  "first name"?: string;
  "last name"?: string;
  email?: string;
  "email address"?: string;
  phone?: string;
  mobile?: string;
  tel?: string;
  source?: string;
  organization?: string;
  status?: string;
  country?: string;
  nation?: string;
  comments?: string;
  notes?: string;
  [key: string]: unknown;
}

// Normalized contact data structure
export interface Contact {
  name: string;
  email: string;
  phone?: string;
  source?: string;
  status?: string;
  country?: string;
  comments?: string;
}

// Import history record structure
export interface ImportHistoryItem {
  _id?: string | Types.ObjectId;
  id?: string;
  fileName: string;
  timestamp: number;
  uploadedBy: string;
  recordCount: number;
  status: "completed" | "failed" | "processing" | "new" | "staging" | "queued";
  successCount: number;
  failureCount: number;
  processedCount?: number;
  duplicateCount?: number;
  errorCount?: number;
  errorMessage?: string | null;
  mode?: string;
  nextChunkIndex?: number;
  chunkTotal?: number;
}

/** Live progress for the import page UI (chunked + Ably). */
export interface ImportProgressState {
  importId: string;
  status: "processing" | "completed" | "failed";
  recordCount: number;
  processedCount: number;
  inserted: number;
  duplicates: number;
  errors: number;
  percent: number;
  chunkIndex: number;
  chunkTotal: number;
  errorMessage?: string;
  startedAt: number;
  estimatedRemainingMs?: number | null;
}

// MongoDB document structure
export interface MongoImportDocument extends Omit<ImportHistoryItem, "id"> {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// API response types
export interface ImportResponse {
  imports: ImportHistoryItem[];
  error?: string;
}

export interface ImportCreateResponse {
  import: ImportHistoryItem;
  error?: string;
}

export interface ImportDeleteResponse {
  message: string;
  error?: string;
}

// Lead request type for API
export interface LeadRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  status?: string;
  country?: string;
  comments?: string;
}

export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "MISSING_HEADERS" &&
    "missingFields" in error &&
    Array.isArray((error as ValidationError).missingFields)
  );
}

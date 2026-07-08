import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { normalizeCountryInput } from "@/lib/countryNormalize";
import {
  buildImportExportCsv,
  EXPORT_NO_COMMENT_LABEL,
  normalizeExportComment,
  sanitizeExportFilename,
  type ImportExportRow,
} from "@/lib/importExport";
import {
  buildLeadStatusNameMap,
  resolveLeadStatusName,
} from "@/lib/leadStatusResolve";

type LeanLead = {
  _id?: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  source?: string;
  comments?: string;
  status?: string;
  leadId?: string;
};

type LastCommentEntry = {
  content: string;
};

const EMPTY_SOURCE_VALUES = new Set(["", "-", "—", "–"]);

export function formatExportSource(source: string | null | undefined): string {
  const trimmed = String(source ?? "").trim();
  if (!trimmed || EMPTY_SOURCE_VALUES.has(trimmed)) {
    return "No source";
  }
  return trimmed;
}

export function formatLastCommentForExport(
  entry: LastCommentEntry | undefined,
  fallbackNotes?: string | null,
): string {
  const normalized = entry?.content?.trim()
    ? normalizeExportComment(entry.content)
    : normalizeExportComment(fallbackNotes);

  return normalized || EXPORT_NO_COMMENT_LABEL;
}

function mapLead(
  doc: LeanLead,
  statusMap: Map<string, string>,
  lastCommentsMap: Map<string, LastCommentEntry>,
): ImportExportRow {
  const leadObjectId = doc._id?.toString() ?? "";
  const lastComment = leadObjectId
    ? lastCommentsMap.get(leadObjectId)
    : undefined;

  return {
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    phone: doc.phone,
    country: normalizeCountryInput(doc.country),
    source: formatExportSource(doc.source),
    comments: formatLastCommentForExport(lastComment, doc.comments),
    status: resolveLeadStatusName(doc.status, statusMap),
    leadId: doc.leadId,
  };
}

const LEAD_EXPORT_SELECT =
  "firstName lastName email phone country source comments status leadId createdAt";

async function fetchLastCommentsForLeads(
  adminObjectId: mongoose.Types.ObjectId,
  leadIds: mongoose.Types.ObjectId[],
): Promise<Map<string, LastCommentEntry>> {
  const map = new Map<string, LastCommentEntry>();
  if (leadIds.length === 0) return map;

  const db = mongoose.connection.db;
  if (!db) return map;

  interface LastCommentResult {
    _id: mongoose.Types.ObjectId;
    content: string;
  }

  const results = await db
    .collection("comments")
    .aggregate<LastCommentResult>([
      {
        $match: {
          leadId: { $in: leadIds },
          $or: [{ adminId: adminObjectId }, { adminId: { $exists: false } }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$leadId",
          content: { $first: "$content" },
        },
      },
    ])
    .toArray();

  for (const result of results) {
    map.set(result._id.toString(), {
      content: result.content,
    });
  }

  return map;
}

export async function fetchLeadsForImportExport(
  adminObjectId: mongoose.Types.ObjectId,
  importId?: string,
): Promise<ImportExportRow[]> {
  const filter: {
    adminId: mongoose.Types.ObjectId;
    importId?: mongoose.Types.ObjectId;
  } = { adminId: adminObjectId };

  if (importId) {
    if (!mongoose.Types.ObjectId.isValid(importId)) {
      throw new Error("Invalid import id");
    }
    filter.importId = new mongoose.Types.ObjectId(importId);
  }

  const [docs, statusMap] = await Promise.all([
    Lead.find(filter)
      .select(`${LEAD_EXPORT_SELECT} _id`)
      .sort({ country: 1, lastName: 1, firstName: 1 })
      .lean<LeanLead[]>(),
    buildLeadStatusNameMap(adminObjectId),
  ]);

  const leadIds = docs
    .map((doc) => doc._id)
    .filter((id): id is mongoose.Types.ObjectId => Boolean(id));

  const lastCommentsMap = await fetchLastCommentsForLeads(
    adminObjectId,
    leadIds,
  );

  return docs.map((doc) => mapLead(doc, statusMap, lastCommentsMap));
}

export function buildCsvDownloadResponse(
  leads: ImportExportRow[],
  filename: string,
): Response {
  const csv = buildImportExportCsv(leads);
  const safeName = sanitizeExportFilename(filename);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}

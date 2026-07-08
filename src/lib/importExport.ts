/**
 * Build import-compatible CSV from lead records so exports can be re-uploaded.
 */

export const IMPORT_EXPORT_HEADERS = [
  "Lead ID",
  "First Name",
  "Last Name",
  "Email",
  "Phone",
  "Country",
  "Source",
  "Status",
  "Comments",
] as const;

export type ImportExportRow = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  source?: string | null;
  comments?: string | null;
  status?: string | null;
  leadId?: string | null;
};

/** UTF-8 BOM so Excel opens Cyrillic and special characters correctly. */
export const CSV_UTF8_BOM = "\uFEFF";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Fix Latin-1 mojibake and normalize dashes for spreadsheet tools. */
export function normalizeExportText(value: string | null | undefined): string {
  let text = String(value ?? "").trim();
  if (!text) return "";

  text = text
    .replace(/\u00e2\u20ac\u2122/g, "'")
    .replace(/\u00e2\u20ac\u02dc/g, "'")
    .replace(/\u00e2\u20ac\u0153/g, '"')
    .replace(/\u00e2\u20ac\u009d/g, '"')
    .replace(/\u00e2\u20ac\u201c/g, "-")
    .replace(/\u00e2\u20ac\u201d/g, "-")
    .replace(/\u00e2\u0080\u0093/g, "-")
    .replace(/\u00e2\u0080\u0094/g, "-");

  return text.replace(/[\u2013\u2014]/g, "-");
}

export const EXPORT_NO_COMMENT_LABEL = "No comments yet";

const EXPORT_COMMENT_LEADING_DATE_PATTERNS = [
  // 8 Jul, 2026 at 9:16 AM (app timeline format)
  /^\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|am|pm))?\s*/i,
  // 2026-07-08T09:16:00.000Z
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*/i,
  // 07/08/2026 with optional time
  /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[AP]M|am|pm))?)?\s*/i,
  // Jul 8, 2026
  /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|am|pm))?\s*/i,
  // 8 July 2026
  /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\s*/i,
  // Agent visit log: 28.06, 04.07, 10.07.2026
  /^\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\s*[-–—:]?\s*/i,
] as const;

const EXPORT_COMMENT_TRAILING_DATE_PATTERNS = [
  /\s*[-–—:|•\\/]+\s*\d{1,2}\s+[A-Za-z]{3,9},?\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|am|pm))?\s*$/i,
  /\s*[-–—:|•\\/]+\s*\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\s*$/i,
  /\s*[-–—:|•\\/]+\s*\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:[AP]M|am|pm))?)?\s*$/i,
  /\s*[-–—:|•\\/]+\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}(?:\s+at\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[AP]M|am|pm))?\s*$/i,
  /\s*[-–—:|•\\/]+\s*\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\s*$/i,
  /\s*[-–—:|•\\/]+\s*\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\s*$/i,
] as const;

const EXPORT_COMMENT_DATE_SEPARATOR = /^\s*[-–—:|•\\/]+\s*/;

const EXPORT_EMPTY_COMMENT_VALUES = new Set([
  "no comments yet",
  "no comment",
  "no comments",
]);

function isExportEmptyComment(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  if (EXPORT_EMPTY_COMMENT_VALUES.has(normalized)) return true;
  if (/^[\s/\-–—:|•\\.]+$/i.test(normalized)) return true;
  return false;
}

function stripLeadingExportCommentDates(text: string): string {
  let result = text.trim();
  if (!result) return "";

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of EXPORT_COMMENT_LEADING_DATE_PATTERNS) {
      if (pattern.test(result)) {
        result = result.replace(pattern, "");
        result = result.replace(EXPORT_COMMENT_DATE_SEPARATOR, "");
        result = result.trim();
        changed = true;
        break;
      }
    }
  }

  for (const pattern of EXPORT_COMMENT_TRAILING_DATE_PATTERNS) {
    result = result.replace(pattern, "").trim();
  }

  for (const pattern of EXPORT_COMMENT_LEADING_DATE_PATTERNS) {
    if (pattern.test(result)) {
      return "";
    }
  }

  return result;
}

/** Remove comment-added dates from export text while keeping the note itself. */
export function stripDatesFromExportComment(
  value: string | null | undefined,
): string {
  return stripLeadingExportCommentDates(String(value ?? "").trim());
}

/** Normalize agent chained notes and placeholders for CSV export. */
export function normalizeExportComment(
  value: string | null | undefined,
): string {
  const raw = String(value ?? "").trim();
  if (!raw || isExportEmptyComment(raw)) return "";

  const segments = raw
    .split(/\s*\/\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates = segments.length > 0 ? segments : [raw];

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const cleaned = stripLeadingExportCommentDates(candidates[index])
      .replace(/[\s/\-–—:|•]*\/\/[\s/\-–—:|•]*$/g, "")
      .trim();

    if (cleaned && !isExportEmptyComment(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

export function leadToExportCells(lead: ImportExportRow): string[] {
  return [
    normalizeExportText(lead.leadId),
    normalizeExportText(lead.firstName),
    normalizeExportText(lead.lastName),
    normalizeExportText(lead.email),
    normalizeExportText(lead.phone),
    normalizeExportText(lead.country),
    normalizeExportText(lead.source),
    normalizeExportText(lead.status),
    normalizeExportText(lead.comments),
  ];
}

export function sortExportRowsByCountry(rows: ImportExportRow[]): ImportExportRow[] {
  return [...rows].sort((a, b) => {
    const countryCmp = (a.country ?? "").localeCompare(b.country ?? "", undefined, {
      sensitivity: "base",
    });
    if (countryCmp !== 0) return countryCmp;

    const lastCmp = (a.lastName ?? "").localeCompare(b.lastName ?? "", undefined, {
      sensitivity: "base",
    });
    if (lastCmp !== 0) return lastCmp;

    return (a.firstName ?? "").localeCompare(b.firstName ?? "", undefined, {
      sensitivity: "base",
    });
  });
}

export function buildImportExportCsv(leads: ImportExportRow[]): string {
  const sorted = sortExportRowsByCountry(leads);
  const lines = [
    IMPORT_EXPORT_HEADERS.join(","),
    ...sorted.map((lead) =>
      leadToExportCells(lead).map(escapeCsvCell).join(","),
    ),
  ];
  return CSV_UTF8_BOM + lines.join("\n");
}

export function sanitizeExportFilename(name: string): string {
  const base = name.replace(/[^\w.\-() ]+/g, "_").trim() || "export";
  return base.endsWith(".csv") ? base : `${base}.csv`;
}

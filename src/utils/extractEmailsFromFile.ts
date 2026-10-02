import * as XLSX from "xlsx";
import {
  findMatchingHeader,
  getHeaderRow,
  isValidEmail,
  readExcelFile,
} from "@/utils/helper";
import {
  classifySheetEmails,
  type EmailSheetDuplicate,
} from "@/lib/emailCheck";

export type ExtractedSheetEmails = {
  /** All non-empty email-column values (includes duplicates + invalid). */
  allValues: string[];
  emails: string[];
  invalid: string[];
  duplicates: EmailSheetDuplicate[];
  duplicateInSheet: number;
  emailHeader: string;
  totalRows: number;
};

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const workbook = XLSX.read(text, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (!matrix.length) {
    return { headers: [], rows: [] };
  }
  const headers = matrix[0].map((h) => String(h ?? "").trim());
  const rows = matrix.slice(1).map((row) =>
    headers.map((_, i) => String(row[i] ?? "").trim()),
  );
  return { headers, rows };
}

function toExtracted(
  emailHeader: string,
  emailValues: string[],
): ExtractedSheetEmails {
  const classified = classifySheetEmails(emailValues, isValidEmail);
  return {
    allValues: emailValues,
    emails: classified.uniqueEmails,
    invalid: classified.invalid,
    duplicates: classified.duplicates,
    duplicateInSheet: classified.duplicateInSheet,
    emailHeader,
    totalRows: emailValues.length,
  };
}

/**
 * Read Excel/CSV and extract the Email / Emails / Email address column only.
 * Does not require name/phone/country like full lead import.
 */
export async function extractEmailsFromFile(
  file: File,
): Promise<ExtractedSheetEmails> {
  const isText =
    file.type === "text/plain" ||
    file.type === "text/csv" ||
    /\.csv$/i.test(file.name);

  if (isText) {
    const text = await file.text();
    const parsed = parseCsvText(text);
    const emailHeader = findMatchingHeader(parsed.headers, "email");
    if (!emailHeader) {
      throw {
        type: "MISSING_EMAIL_HEADER",
        message:
          'Sheet must include an "Email", "Emails", or "Email address" column header.',
      };
    }
    const col = parsed.headers.indexOf(emailHeader);
    const emailValues = parsed.rows
      .map((row) => row[col] ?? "")
      .filter((v) => v.length > 0);
    return toExtracted(emailHeader, emailValues);
  }

  const workbook = await readExcelFile(file);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const headers = getHeaderRow(worksheet);
  const emailHeader = findMatchingHeader(headers, "email");
  if (!emailHeader) {
    throw {
      type: "MISSING_EMAIL_HEADER",
      message:
        'Sheet must include an "Email", "Emails", or "Email address" column header.',
    };
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: "",
  }) as Record<string, string>[];

  const emailValues = rows
    .map((row) => String(row[emailHeader] ?? "").trim())
    .filter((v) => v.length > 0);

  return toExtracted(emailHeader, emailValues);
}

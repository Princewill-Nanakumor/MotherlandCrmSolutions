import * as XLSX from "xlsx";
import { LeadRequest } from "./types";
import {
  readExcelFile,
  getHeaderRow,
  findMatchingHeader,
  isValidEmail,
  splitName,
} from "./helper";
import { validateHeaders } from "./validation";

const DEFAULT_STATUS = "NEW";

function cellAt(
  row: unknown[],
  headers: string[],
  header: string | undefined,
): string {
  if (!header) return "";
  const index = headers.indexOf(header);
  if (index < 0 || index >= row.length) return "";
  return String(row[index] ?? "").trim();
}

export const processExcelFile = async (file: File): Promise<LeadRequest[]> => {
  try {
    const workbook = await readExcelFile(file);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // Read as a matrix so column index matches getHeaderRow — object-key
    // lookup fails when sheet_to_json keeps untrimmed / differently keyed headers.
    const matrix = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }) as unknown[][];

    if (!Array.isArray(matrix) || matrix.length < 2) {
      throw new Error("No data found in file");
    }

    const headers: string[] =
      matrix[0]?.map((h) => String(h ?? "").replace(/^\uFEFF/, "").trim()) ??
      getHeaderRow(worksheet);
    const rows = matrix.slice(1);

    // Enhanced validation with detailed error messages
    const { missingFields, foundHeaders, errorMessage } =
      validateHeaders(headers);
    if (missingFields.length > 0) {
      throw {
        type: "MISSING_HEADERS",
        missingFields: missingFields,
        foundHeaders: foundHeaders,
        errorMessage: errorMessage,
        message: "Missing required headers",
      };
    }

    // Use enhanced header matching
    const nameHeader = findMatchingHeader(headers, "name");
    const firstNameHeader = findMatchingHeader(headers, "first name");
    const lastNameHeader = findMatchingHeader(headers, "last name");
    const emailHeader = findMatchingHeader(headers, "email");
    const phoneHeader = findMatchingHeader(headers, "phone");
    let sourceHeader = findMatchingHeader(headers, "source");
    const commentsHeader = findMatchingHeader(headers, "comments");
    const countryHeader = findMatchingHeader(headers, "country");

    // If sourceHeader is the same as countryHeader, treat as missing
    if (sourceHeader && countryHeader && sourceHeader === countryHeader) {
      sourceHeader = undefined;
    }

    const validLeads: LeadRequest[] = [];
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      if (row.every((v) => String(v ?? "").trim() === "")) continue;

      // Use "Name" or "Full Name" if available, else combine "First Name" + "Last Name"
      let fullName = "";
      if (nameHeader) {
        fullName = cellAt(row, headers, nameHeader);
      } else if (firstNameHeader && lastNameHeader) {
        fullName =
          `${cellAt(row, headers, firstNameHeader)} ${cellAt(row, headers, lastNameHeader)}`.trim();
      }

      const email = cellAt(row, headers, emailHeader);
      const phone = cellAt(row, headers, phoneHeader);

      // Prefer sheet Source; leave empty when absent so staging can apply a default.
      let source = "";
      if (sourceHeader && sourceHeader !== countryHeader) {
        source = cellAt(row, headers, sourceHeader);
      }

      const commentsRaw = cellAt(row, headers, commentsHeader);
      const comments = commentsRaw || "No comments yet";
      const country = cellAt(row, headers, countryHeader);

      if (!fullName || !email || !isValidEmail(email)) {
        continue;
      }

      const { firstName, lastName } = splitName(fullName);

      validLeads.push({
        firstName,
        lastName,
        email,
        phone,
        source: source || undefined,
        comments,
        status: DEFAULT_STATUS,
        country,
      });
    }

    if (validLeads.length === 0) {
      throw {
        type: "NO_VALID_LEADS",
        message:
          "No valid leads found in file. Please ensure your file contains valid email addresses and names.",
      };
    }

    return validLeads;
  } catch (error) {
    // Always throw the error as-is to preserve custom properties
    throw error;
  }
};

/**
 * L9: minimal RFC-4180-compatible CSV/TSV parser. Handles:
 *   - quoted fields containing the delimiter
 *   - quoted fields containing CR/LF
 *   - escaped quotes ("")
 * Returns a 2-D array of rows. We avoid `text.split(/[\n\r]+/)` and
 * `firstLine.split(delimiter)` because both mangle quoted content.
 */
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      // Treat CRLF as one line break.
      if (text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Flush trailing field/row (when file doesn't end with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length > 0 && r.some((f) => f.trim() !== ""));
}

export const processTextData = async (text: string): Promise<LeadRequest[]> => {
  try {
    if (!text || text.trim() === "") {
      throw new Error("Data must contain headers and at least one data row");
    }

    // Detect the delimiter from the first non-empty line. Tab-separated
    // pastes are common from spreadsheets, otherwise default to comma.
    const firstLineEnd = text.search(/\r|\n/);
    const firstLine =
      firstLineEnd === -1 ? text : text.slice(0, firstLineEnd);
    const delimiter = firstLine.includes("\t") ? "\t" : ",";

    const rows = parseDelimited(text, delimiter);
    if (rows.length < 2) {
      throw new Error("Data must contain headers and at least one data row");
    }

    const headers = rows[0].map((h) => h.replace(/^\uFEFF/, "").trim());

    // Enhanced validation with detailed error messages
    const { missingFields, foundHeaders, errorMessage } =
      validateHeaders(headers);
    if (missingFields.length > 0) {
      throw {
        type: "MISSING_HEADERS",
        missingFields: missingFields,
        foundHeaders: foundHeaders,
        errorMessage: errorMessage,
        message: "Missing required headers",
      };
    }

    // Use enhanced header matching
    const nameHeader = findMatchingHeader(headers, "name");
    const firstNameHeader = findMatchingHeader(headers, "first name");
    const lastNameHeader = findMatchingHeader(headers, "last name");
    const emailHeader = findMatchingHeader(headers, "email");
    const phoneHeader = findMatchingHeader(headers, "phone");
    let sourceHeader = findMatchingHeader(headers, "source");
    const commentsHeader = findMatchingHeader(headers, "comments");
    const countryHeader = findMatchingHeader(headers, "country");

    // If sourceHeader is the same as countryHeader, treat as missing
    if (sourceHeader && countryHeader && sourceHeader === countryHeader) {
      sourceHeader = undefined;
    }

    const validLeads: LeadRequest[] = [];

    for (const valuesRaw of rows.slice(1)) {
      const values = valuesRaw.map((v) => v.trim());
      if (values.every((v) => v === "")) continue;

      // Use "Name" or "Full Name" if available, else combine "First Name" + "Last Name"
      let fullName = "";
      if (nameHeader) {
        fullName = values[headers.indexOf(nameHeader)] || "";
      } else if (firstNameHeader && lastNameHeader) {
        fullName =
          (values[headers.indexOf(firstNameHeader)] || "") +
          " " +
          (values[headers.indexOf(lastNameHeader)] || "");
      }

      const email = emailHeader
        ? values[headers.indexOf(emailHeader)] || ""
        : "";
      const phone = phoneHeader
        ? values[headers.indexOf(phoneHeader)] || ""
        : "";

      // Prefer sheet Source; leave empty when absent so staging can apply a default.
      let source = "";
      if (sourceHeader && sourceHeader !== countryHeader) {
        const sourceIdx = headers.indexOf(sourceHeader);
        source =
          sourceIdx >= 0 ? (values[sourceIdx] || "").trim() : "";
      }

      const comments = commentsHeader
        ? values[headers.indexOf(commentsHeader)] || "No comments yet"
        : "No comments yet";
      const country = countryHeader
        ? values[headers.indexOf(countryHeader)] || ""
        : "";

      if (!fullName.trim() || !email.trim() || !isValidEmail(email)) continue;

      const { firstName, lastName } = splitName(fullName);

      validLeads.push({
        firstName,
        lastName,
        email,
        phone,
        source: source || undefined,
        comments,
        status: DEFAULT_STATUS,
        country,
      });
    }

    if (validLeads.length === 0) {
      throw {
        type: "NO_VALID_LEADS",
        message:
          "No valid leads found in data. Please ensure your data contains valid email addresses and names.",
      };
    }
    return validLeads;
  } catch (error) {
    throw error;
  }
};

import * as XLSX from "xlsx";
import {
  IMPORT_COUNTRY_HEADERS,
  IMPORT_EMAIL_HEADERS,
  IMPORT_FIRST_NAME_HEADERS,
  IMPORT_LAST_NAME_HEADERS,
  IMPORT_NAME_HEADERS,
  IMPORT_PHONE_HEADERS,
  IMPORT_SOURCE_HEADERS,
} from "@/lib/importHeaderAliases";

// Expanded ContactField type
export type ContactField =
  | "name"
  | "first name"
  | "last name"
  | "email"
  | "phone"
  | "source"
  | "status"
  | "country"
  | "comments";

// Expanded header mappings for robust matching (casing variants included;
// normalizeText makes matching case-insensitive either way).
export const headerMappings: Record<ContactField, string[]> = {
  name: [
    ...IMPORT_NAME_HEADERS,
    "contact name",
    "customer name",
    "client name",
  ],
  "first name": [...IMPORT_FIRST_NAME_HEADERS],
  "last name": [...IMPORT_LAST_NAME_HEADERS],
  email: [...IMPORT_EMAIL_HEADERS, "e mail", "e-mail address"],
  phone: [
    ...IMPORT_PHONE_HEADERS,
    "phone no",
    "phone #",
    "telephone",
    "tel",
    "mobile number",
    "cell phone",
  ],
  source: [
    ...IMPORT_SOURCE_HEADERS,
    "leadsource",
    "traffic source",
    "company",
    "organization",
    "organisation",
    "business name",
    "company name",
  ],
  status: ["status", "Status", "STATUS"],
  country: [...IMPORT_COUNTRY_HEADERS, "nation", "location", "Nation", "Location"],
  comments: [
    "comments",
    "Comments",
    "comment",
    "Comment",
    "notes",
    "Notes",
    "note",
    "description",
  ],
};

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize sheet headers for matching. Handles Excel quirks that break
 * naive `toLowerCase()` equality: BOM, NBSP / other unicode spaces,
 * punctuation, and irregular spacing ("Full  Name", "Phone number").
 */
export function normalizeText(text: string): string {
  return String(text ?? "")
    .replace(/^\uFEFF/, "")
    .normalize("NFKC")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[*：:]+$/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

// Accepts ContactField or string for flexibility
export function findMatchingHeader(
  headers: string[],
  field: ContactField | string
): string | undefined {
  const normalizedHeaders = headers.map(normalizeText);

  const possibleMatches = headerMappings[field as ContactField]?.map(
    normalizeText,
  ) ?? [normalizeText(field)];

  const headerIndex = normalizedHeaders.findIndex((header) =>
    possibleMatches.includes(header),
  );

  return headerIndex !== -1 ? headers[headerIndex] : undefined;
}

export function splitName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

export const getHeaderRow = (worksheet: XLSX.WorkSheet): string[] => {
  const headers: string[] = [];
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const R = range.s.r;

  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
    const header = cell ? cell.v : "";
    headers.push(
      header ? String(header).replace(/^\uFEFF/, "").trim() : "",
    );
  }

  return headers;
};

export const readExcelFile = async (file: File): Promise<XLSX.WorkBook> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        resolve(workbook);
      } catch (error) {
        console.error("Error reading Excel file:", error);
        reject(error);
      }
    };
    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};

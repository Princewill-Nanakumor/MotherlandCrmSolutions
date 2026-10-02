import * as XLSX from "xlsx";

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

// Expanded header mappings for robust matching
export const headerMappings: Record<ContactField, string[]> = {
  name: ["name", "full name"],
  "first name": ["first name", "firstname", "given name"],
  "last name": ["last name", "lastname", "surname", "family name"],
  email: ["email", "email address", "emails", "e-mail", "e-mails"],
  phone: ["phone", "phone number", "mobile", "cell"],
  source: ["source"],
  status: ["status"],
  country: ["country"],
  comments: ["comments", "comment", "notes", "note"],
};

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, "");
}

// Accepts ContactField or string for flexibility
export function findMatchingHeader(
  headers: string[],
  field: ContactField | string
): string | undefined {
  const normalizedHeaders = headers.map(normalizeText);

  // Use headerMappings if available, else just try the field itself
  const possibleMatches = headerMappings[field as ContactField]?.map(
    normalizeText
  ) ?? [normalizeText(field)];

  // Log the search process for debugging
  // console.log(`Searching for ${field} header`);
  // console.log("Normalized headers:", normalizedHeaders);
  // console.log("Possible matches:", possibleMatches);

  const headerIndex = normalizedHeaders.findIndex((header) =>
    possibleMatches.includes(header)
  );

  const foundHeader = headerIndex !== -1 ? headers[headerIndex] : undefined;
  // console.log(`Found header for ${field}:`, foundHeader);

  return foundHeader;
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
    headers.push(header ? String(header).trim() : "");
  }

  // Log headers for debugging
  // console.log("Found headers in Excel:", headers);
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

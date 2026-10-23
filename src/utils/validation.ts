// src/utils/validation.ts
import {
  IMPORT_COUNTRY_HEADERS,
  IMPORT_EMAIL_HEADERS,
  IMPORT_FIRST_NAME_HEADERS,
  IMPORT_LAST_NAME_HEADERS,
  IMPORT_NAME_HEADERS,
  IMPORT_PHONE_HEADERS,
  IMPORT_SOURCE_HEADERS,
} from "@/lib/importHeaderAliases";
import { normalizeText } from "./helper";

const REQUIRED_HEADERS = ["email", "name", "country", "phone"] as const;
const OPTIONAL_HEADERS = ["source", "comments"] as const;

const HEADER_ALIASES: Record<
  (typeof REQUIRED_HEADERS)[number] | (typeof OPTIONAL_HEADERS)[number],
  string[]
> = {
  email: [...IMPORT_EMAIL_HEADERS, "e mail", "e-mail address"],
  name: [
    ...IMPORT_NAME_HEADERS,
    "names",
    "Names",
    "contact name",
    "customer name",
    "client name",
  ],
  phone: [
    ...IMPORT_PHONE_HEADERS,
    "phone no",
    "phone #",
    "telephone",
    "tel",
    "mobile number",
    "cell phone",
  ],
  country: [
    ...IMPORT_COUNTRY_HEADERS,
    "nation",
    "Nation",
    "location",
    "Location",
  ],
  source: [...IMPORT_SOURCE_HEADERS, "referral", "Referral"],
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

const FIRST_NAME_ALIASES = [...IMPORT_FIRST_NAME_HEADERS];
const LAST_NAME_ALIASES = [...IMPORT_LAST_NAME_HEADERS];

function headerMatchesAny(headers: string[], aliases: string[]): boolean {
  const normalizedHeaders = headers.map(normalizeText);
  return aliases.some((alias) =>
    normalizedHeaders.includes(normalizeText(alias)),
  );
}

export interface ValidationHeaders {
  missingFields: string[];
  foundHeaders: string[];
  suggestions: string[];
  errorMessage: string;
}

export function validateHeaders(headers: string[]): ValidationHeaders {
  const missingFields: string[] = [];
  const foundHeaders: string[] = [];
  const suggestions: string[] = [];

  const hasFullName = headerMatchesAny(headers, HEADER_ALIASES.name);
  const hasFirstAndLastName =
    headerMatchesAny(headers, FIRST_NAME_ALIASES) &&
    headerMatchesAny(headers, LAST_NAME_ALIASES);

  for (const required of REQUIRED_HEADERS) {
    const hasHeader =
      required === "name"
        ? hasFullName || hasFirstAndLastName
        : headerMatchesAny(headers, [
            required,
            ...(HEADER_ALIASES[required] || []),
          ]);

    if (!hasHeader) {
      missingFields.push(required);
      if (required === "name") {
        suggestions.push(
          ...HEADER_ALIASES.name,
          ...FIRST_NAME_ALIASES,
          ...LAST_NAME_ALIASES,
        );
      } else {
        suggestions.push(...(HEADER_ALIASES[required] || [required]));
      }
    } else {
      foundHeaders.push(required);
    }
  }

  for (const optional of OPTIONAL_HEADERS) {
    if (
      headerMatchesAny(headers, [optional, ...(HEADER_ALIASES[optional] || [])])
    ) {
      foundHeaders.push(optional);
    }
  }

  let errorMessage = "";
  if (missingFields.length > 0) {
    errorMessage = `Missing required headers: ${missingFields.join(", ")}.\n\n`;
    errorMessage += `Headers found in your file: ${headers.join(", ")}\n\n`;
    errorMessage += `Please add these headers to your file:\n`;
    missingFields.forEach((field) => {
      if (field === "name") {
        errorMessage += `- name (Full Name, or First Name + Last Name)\n`;
        return;
      }
      const aliases = HEADER_ALIASES[field as keyof typeof HEADER_ALIASES];
      if (aliases) {
        errorMessage += `- ${field} (or: ${aliases.join(", ")})\n`;
      } else {
        errorMessage += `- ${field}\n`;
      }
    });
  }

  return {
    missingFields,
    foundHeaders,
    suggestions: [...new Set(suggestions)],
    errorMessage,
  };
}

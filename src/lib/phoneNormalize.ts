import type { CountryCode } from "libphonenumber-js";
import { getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { countryOptions } from "@/components/authComponents/CountryData";

const SCIENTIFIC_NUMBER_RE =
  /^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/;

function toRegionCode(input: string | null | undefined): CountryCode | undefined {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return undefined;
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase() as CountryCode;
  }

  const match = countryOptions.find(
    (option) =>
      option.label.toLowerCase() === trimmed.toLowerCase() ||
      option.value.toLowerCase() === trimmed.toLowerCase(),
  );

  return match?.value.toUpperCase() as CountryCode | undefined;
}

/**
 * Expand Excel/CSV scientific notation ("3.53895E+11") into a plain digit string.
 * Precision is limited to whatever digits are present in the mantissa.
 */
export function expandScientificNumericString(value: string): string | null {
  const trimmed = String(value ?? "").trim().replace(/\s+/g, "");
  const match = SCIENTIFIC_NUMBER_RE.exec(trimmed);
  if (!match) return null;

  const sign = match[1] === "-" ? "-" : "";
  const intPart = match[2];
  const fracPart = match[3] ?? "";
  const exp = Number(match[4]);
  if (!Number.isFinite(exp)) return null;

  const digits = intPart + fracPart;
  const point = intPart.length + exp;

  let body: string;
  if (point <= 0) {
    body = `0.${"0".repeat(-point)}${digits}`;
  } else if (point >= digits.length) {
    body = digits + "0".repeat(point - digits.length);
  } else {
    body = `${digits.slice(0, point)}.${digits.slice(point)}`;
  }

  if (body.includes(".")) {
    const [whole, frac = ""] = body.split(".");
    body = /^0*$/.test(frac) ? whole : `${whole}${frac}`;
  }

  return `${sign}${body}`;
}

/**
 * Coerce import/API phone cells so Excel numbers are not stored as "3.53E+11".
 * Prefer numeric raw values (safe integers) from spreadsheets.
 */
export function coercePhoneImportValue(value: unknown): string {
  if (value == null) return "";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    const asInt = Math.trunc(value);
    if (Number.isSafeInteger(asInt)) return String(asInt);
    try {
      return BigInt(asInt).toString();
    } catch {
      return expandScientificNumericString(String(value)) ?? String(value);
    }
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const expanded = expandScientificNumericString(raw);
  if (expanded) {
    // Phones are digit strings; drop a leading "-" if present.
    return expanded.replace(/[^\d]/g, "");
  }

  return raw;
}

/**
 * Normalize a phone for storage and dialers (E.164 when possible).
 */
export function normalizePhoneToE164(
  phone: string | null | undefined,
  countryHint?: string | null,
): string {
  const trimmed = coercePhoneImportValue(phone);
  if (!trimmed) return "";

  // Already international: parse as-is (never prepend another country code).
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const international = trimmed.startsWith("00")
      ? `+${trimmed.slice(2).replace(/[^\d]/g, "")}`
      : trimmed;
    const parsedInternational = parsePhoneNumberFromString(international);
    if (parsedInternational?.isValid()) {
      return parsedInternational.format("E.164");
    }
    const digitsOnly = international.replace(/[^\d+]/g, "");
    return digitsOnly.startsWith("+") ? digitsOnly : trimmed;
  }

  const region = toRegionCode(countryHint);
  const digitsOnly = trimmed.replace(/[^\d]/g, "");

  // Some imports contain international numbers without the "+" prefix
  // (e.g. "491701234567" for DE). If we parse those as national numbers with
  // a country hint, libphonenumber can produce duplicated country code
  // ("+4949..."). Detect and normalize these as international first.
  if (region && digitsOnly) {
    try {
      const callingCode = getCountryCallingCode(region);
      if (digitsOnly.startsWith(callingCode)) {
        const parsedAsInternational = parsePhoneNumberFromString(`+${digitsOnly}`);
        if (parsedAsInternational?.isValid()) {
          return parsedAsInternational.format("E.164");
        }
      }
    } catch {
      // Ignore invalid region/calling-code lookups and continue normal flow.
    }
  }

  let parsed = parsePhoneNumberFromString(trimmed);
  if ((!parsed || !parsed.isValid()) && region) {
    parsed = parsePhoneNumberFromString(trimmed, region);
  }
  if ((!parsed || !parsed.isValid()) && trimmed.startsWith("0")) {
    parsed = parsePhoneNumberFromString(trimmed, "IL");
  }

  if (parsed?.isValid()) {
    return parsed.format("E.164");
  }

  const fallbackClean = trimmed.replace(/[^\d+]/g, "");
  if (fallbackClean.startsWith("+")) return fallbackClean;
  return trimmed;
}

/**
 * Normalize for click-to-dial when the stored value may be local format.
 */
export function normalizePhoneForDialer(
  phone: string | null | undefined,
  countryHint?: string | null,
): string {
  return normalizePhoneToE164(phone, countryHint);
}

/**
 * Display phone in tables and lists (E.164 when possible).
 */
export function formatLeadPhoneForTable(
  phone: string | null | undefined,
  options: {
    countryHint?: string | null;
    canViewFull?: boolean;
    mask?: (value: string) => string;
  } = {},
): string {
  const raw = String(phone ?? "").trim();
  if (!raw) return "—";

  const normalized = normalizePhoneToE164(raw, options.countryHint) || raw;
  const canViewFull = options.canViewFull !== false;

  if (!canViewFull) {
    const mask = options.mask ?? ((value: string) => value);
    const masked = mask(normalized);
    return masked === "Not provided" ? "—" : masked;
  }

  return normalized;
}

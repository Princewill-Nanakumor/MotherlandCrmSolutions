import type { CountryCode } from "libphonenumber-js";
import { getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js";
import { countryOptions } from "@/components/authComponents/CountryData";

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
 * Normalize a phone for storage and dialers (E.164 when possible).
 */
export function normalizePhoneToE164(
  phone: string | null | undefined,
  countryHint?: string | null,
): string {
  const trimmed = String(phone ?? "").trim();
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

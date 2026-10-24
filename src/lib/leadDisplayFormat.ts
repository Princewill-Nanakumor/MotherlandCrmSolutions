/**
 * Capitalize the first letter of every word, regardless of the input casing.
 * Handles all-caps ("JOHN DOE"), all-lowercase ("john doe"), and multi-word
 * values that include middle names ("john michael doe"). Word boundaries also
 * cover hyphens and apostrophes so "mary-jane o'brien" → "Mary-Jane O'Brien".
 */
export function capitalizeWords(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(
      /(^|[\s\-/'’])(\p{L})/gu,
      (_match, boundary: string, char: string) => boundary + char.toUpperCase(),
    );
}

/**
 * Display email with a leading capital, normalizing the rest to lowercase so
 * all-caps sheets ("JOHN@MAIL.COM") and mixed input display consistently as
 * "John@mail.com". Copy actions still use the raw stored value.
 */
export function formatLeadDetailEmail(email: string | null | undefined): string {
  const trimmed = String(email ?? "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Resolve a lead's display name (title-cased) from an optional combined `name`
 * field or the first/last name fields. Ensures the table and details panel show
 * capitalized names even when the source sheet is all-caps or lowercase.
 */
export function formatLeadDisplayName(lead: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const combined = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
  const base = combined || String(lead.name ?? "").trim();
  return capitalizeWords(base);
}

/** Display country with each word capitalized. */
export function formatLeadDetailCountry(
  country: string | null | undefined,
): string {
  const trimmed = String(country ?? "").trim();
  if (!trimmed) return "";
  return capitalizeWords(trimmed);
}

/** Display source with capitalized segments (e.g. "facebook - landing"). */
export function formatLeadDetailSource(source: string | null | undefined): string {
  const trimmed = String(source ?? "").trim();
  if (!trimmed) return "";

  return trimmed
    .split(" - ")
    .map((segment) =>
      segment
        .split("-")
        .map((part) => capitalizeWords(part))
        .join("-"),
    )
    .join(" - ");
}

const EMPTY_SOURCE_VALUES = new Set(["", "-", "—", "–"]);

/** Add Lead select sentinel — never persist as a real source. */
export const MANUAL_SOURCE_SELECT_VALUE = "__manual__";

/**
 * True when the value is a real source name (not blank, placeholder, or UI sentinel).
 * Use for create/update validation on client and server.
 */
export function isProvidedLeadSource(
  source: string | null | undefined,
): boolean {
  const trimmed = String(source ?? "").trim();
  if (!trimmed || EMPTY_SOURCE_VALUES.has(trimmed)) return false;
  if (trimmed.toLowerCase() === MANUAL_SOURCE_SELECT_VALUE) return false;
  return true;
}

/**
 * Persist source with each word capitalized so imports like "facebook ads"
 * store and filter as "Facebook Ads". Placeholders stay as "—".
 */
export function normalizeLeadSource(
  source: string | null | undefined,
): string {
  if (!isProvidedLeadSource(source)) return "—";
  return formatLeadDetailSource(String(source).trim());
}

export function formatLeadDetailName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return formatLeadDisplayName({ firstName, lastName });
}

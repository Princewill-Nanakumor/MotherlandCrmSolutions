import { formatPersonName } from "@/lib/leadAssignmentDisplay";

/** Capitalize the first letter of each word (e.g. "united states" → "United States"). */
export function capitalizeWords(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Display email with a leading capital (e.g. "test@mail.com" → "Test@mail.com"). */
export function formatLeadDetailEmail(email: string | null | undefined): string {
  const trimmed = String(email ?? "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Display country with each word capitalized. */
export function formatLeadDetailCountry(
  country: string | null | undefined,
): string {
  const trimmed = String(country ?? "").trim();
  if (!trimmed) return "";
  return capitalizeWords(trimmed);
}

/** Display source with capitalized segments (e.g. "taboola - dev-send"). */
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

export function formatLeadDetailName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return formatPersonName(firstName ?? undefined, lastName ?? undefined);
}

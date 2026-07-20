import { countryOptions } from "@/components/authComponents/CountryData";

function normKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const aliasToCanonicalLabel = new Map<string, string>();
const canonicalLabelToAliases = new Map<string, Set<string>>();

function registerCanonical(label: string, ...aliases: string[]) {
  const canonical = label.trim();
  if (!canonical) return;

  const aliasSet = canonicalLabelToAliases.get(canonical) ?? new Set<string>();
  aliasSet.add(canonical);

  for (const alias of [canonical, ...aliases]) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    aliasSet.add(trimmed);
    aliasToCanonicalLabel.set(normKey(trimmed), canonical);
  }

  canonicalLabelToAliases.set(canonical, aliasSet);
}

for (const { value, label } of countryOptions) {
  registerCanonical(label, value);
}

/** Common import spellings beyond ISO list */
const EXTRA_ALIASES: Array<[string, string[]]> = [
  ["United States", ["USA", "U.S.A.", "U.S.", "US of A", "America"]],
  ["United Kingdom", ["UK", "U.K.", "Great Britain", "Britain", "England"]],
  ["United Arab Emirates", ["UAE", "U.A.E.", "Emirates"]],
  ["South Korea", ["Korea", "Republic of Korea"]],
  ["Czech Republic", ["Czechia"]],
];

for (const [label, extras] of EXTRA_ALIASES) {
  if (aliasToCanonicalLabel.has(normKey(label))) {
    registerCanonical(label, ...extras);
  }
}

/**
 * Maps ISO codes, names, and common variants to the CRM display name
 * (e.g. "US", "usa", "United States" → "United States").
 * Unknown values are returned trimmed as-is.
 */
export function normalizeCountryInput(raw: string | null | undefined): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  return aliasToCanonicalLabel.get(normKey(trimmed)) ?? trimmed;
}

/** All stored spellings that should match a filter selection or canonical name. */
export function expandCountryFilterValues(inputs: string[]): string[] {
  const expanded = new Set<string>();

  for (const input of inputs) {
    const trimmed = input.trim();
    if (!trimmed) continue;

    expanded.add(trimmed);
    const canonical = normalizeCountryInput(trimmed);
    expanded.add(canonical);

    const aliases = canonicalLabelToAliases.get(canonical);
    if (aliases) {
      for (const alias of aliases) expanded.add(alias);
    }
  }

  return Array.from(expanded);
}

export function countriesMatch(
  leadCountry: string | null | undefined,
  filterCountry: string,
): boolean {
  const lead = String(leadCountry ?? "").trim();
  const filter = filterCountry.trim();
  if (!filter) return true;
  if (!lead) return false;

  if (normKey(lead) === normKey(filter)) return true;

  const leadCanonical = normalizeCountryInput(lead);
  const filterCanonical = normalizeCountryInput(filter);
  if (leadCanonical && filterCanonical && leadCanonical === filterCanonical) {
    return true;
  }

  const filterAliases = expandCountryFilterValues([filter]);
  return filterAliases.some((alias) => normKey(alias) === normKey(lead));
}

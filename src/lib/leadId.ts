export function normalizeLeadId(
  leadId: string | number | null | undefined,
): string {
  if (leadId === null || leadId === undefined) return "";
  return String(leadId).trim();
}

export function isLegacyNumericLeadId(value: string): boolean {
  return /^\d{5,6}$/.test(value);
}

export function isPrefixedLeadId(value: string): boolean {
  return /^LD-[A-Za-z0-9_-]+$/i.test(value);
}

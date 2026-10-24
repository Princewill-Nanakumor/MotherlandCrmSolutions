/** Secondary email/phone entries on a lead (primary remains `email` / `phone`). */

export type LeadContactEntry = {
  value: string;
  label?: string;
};

export const MAX_LEAD_CONTACT_EXTRAS = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeContactEntryLabel(label: unknown): string | undefined {
  if (typeof label !== "string") return undefined;
  const trimmed = label.trim();
  return trimmed ? trimmed.slice(0, 40) : undefined;
}

function normalizeEmailEntryValue(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .trim();
}

function normalizePhoneEntryValue(value: unknown): string {
  return String(value ?? "").trim();
}

function asRawEntries(input: unknown): unknown[] {
  if (!Array.isArray(input)) return [];
  return input;
}

/**
 * Normalize secondary emails. Skips empty values. Throws on invalid shape,
 * over cap, invalid email, or duplicate (vs primary or within list).
 */
export function normalizeEmailEntries(
  input: unknown,
  primaryEmail: string,
): LeadContactEntry[] {
  const primary = normalizeEmailEntryValue(primaryEmail);
  const seen = new Set<string>(primary ? [primary] : []);
  const out: LeadContactEntry[] = [];

  for (const raw of asRawEntries(input)) {
    if (raw == null) continue;
    if (typeof raw === "string") {
      const value = normalizeEmailEntryValue(raw);
      if (!value) continue;
      if (!EMAIL_RE.test(value)) {
        throw new Error(`Invalid extra email: ${value}`);
      }
      if (seen.has(value)) {
        throw new Error(`Duplicate email: ${value}`);
      }
      seen.add(value);
      out.push({ value });
      continue;
    }
    if (typeof raw !== "object") {
      throw new Error("Invalid emails entry");
    }
    const value = normalizeEmailEntryValue(
      (raw as { value?: unknown }).value,
    );
    if (!value) continue;
    if (!EMAIL_RE.test(value)) {
      throw new Error(`Invalid extra email: ${value}`);
    }
    if (seen.has(value)) {
      throw new Error(`Duplicate email: ${value}`);
    }
    seen.add(value);
    const label = normalizeContactEntryLabel(
      (raw as { label?: unknown }).label,
    );
    out.push(label ? { value, label } : { value });
  }

  if (out.length > MAX_LEAD_CONTACT_EXTRAS) {
    throw new Error(
      `At most ${MAX_LEAD_CONTACT_EXTRAS} additional emails are allowed`,
    );
  }
  return out;
}

/**
 * Normalize secondary phones. Skips empty values. Throws on over cap or
 * duplicate (vs primary or within list, digit-insensitive).
 */
export function normalizePhoneEntries(
  input: unknown,
  primaryPhone: string,
): LeadContactEntry[] {
  const primaryDigits = normalizePhoneEntryValue(primaryPhone).replace(
    /\D/g,
    "",
  );
  const seen = new Set<string>(primaryDigits ? [primaryDigits] : []);
  const out: LeadContactEntry[] = [];

  for (const raw of asRawEntries(input)) {
    if (raw == null) continue;
    if (typeof raw === "string") {
      const value = normalizePhoneEntryValue(raw);
      if (!value) continue;
      const digits = value.replace(/\D/g, "");
      if (digits.length < 3) {
        throw new Error(`Invalid extra phone: ${value}`);
      }
      if (seen.has(digits)) {
        throw new Error(`Duplicate phone: ${value}`);
      }
      seen.add(digits);
      out.push({ value });
      continue;
    }
    if (typeof raw !== "object") {
      throw new Error("Invalid phones entry");
    }
    const value = normalizePhoneEntryValue(
      (raw as { value?: unknown }).value,
    );
    if (!value) continue;
    const digits = value.replace(/\D/g, "");
    if (digits.length < 3) {
      throw new Error(`Invalid extra phone: ${value}`);
    }
    if (seen.has(digits)) {
      throw new Error(`Duplicate phone: ${value}`);
    }
    seen.add(digits);
    const label = normalizeContactEntryLabel(
      (raw as { label?: unknown }).label,
    );
    out.push(label ? { value, label } : { value });
  }

  if (out.length > MAX_LEAD_CONTACT_EXTRAS) {
    throw new Error(
      `At most ${MAX_LEAD_CONTACT_EXTRAS} additional phones are allowed`,
    );
  }
  return out;
}

export function maskContactEntries(
  entries: LeadContactEntry[] | undefined | null,
  maskValue: (value: string) => string,
): LeadContactEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  return entries.map((entry) => ({
    value: maskValue(entry.value),
    ...(entry.label ? { label: entry.label } : {}),
  }));
}

export function coerceContactEntries(
  input: unknown,
): LeadContactEntry[] {
  if (!Array.isArray(input)) return [];
  const out: LeadContactEntry[] = [];
  for (const raw of input) {
    if (typeof raw === "string") {
      const value = raw.trim();
      if (value) out.push({ value });
      continue;
    }
    if (raw && typeof raw === "object" && "value" in raw) {
      const value = String((raw as { value?: unknown }).value ?? "").trim();
      if (!value) continue;
      const label = normalizeContactEntryLabel(
        (raw as { label?: unknown }).label,
      );
      out.push(label ? { value, label } : { value });
    }
  }
  return out;
}

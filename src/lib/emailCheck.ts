/** Cap for a single email-check upload (same order as import). */
export const MAX_EMAILS_PER_CHECK = 50_000;

/** Mongo $in batch size to keep query documents bounded. */
export const EMAIL_CHECK_QUERY_BATCH = 5_000;

export function normalizeCheckEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function getEmailCheckLimitError(count: number): string | null {
  if (!Number.isFinite(count) || count < 0) {
    return "Invalid email count";
  }
  if (count > MAX_EMAILS_PER_CHECK) {
    return (
      `You can check at most ${MAX_EMAILS_PER_CHECK.toLocaleString()} emails per upload. ` +
      `Your file has ${Math.floor(count).toLocaleString()} — split it and try again.`
    );
  }
  return null;
}

export type EmailSheetDuplicate = {
  email: string;
  /** Total times this email appears in the sheet (≥ 2). */
  count: number;
};

export type EmailCheckClassification = {
  uniqueEmails: string[];
  invalid: string[];
  duplicates: EmailSheetDuplicate[];
  /** Extra rows beyond the first occurrence of each duplicate email. */
  duplicateInSheet: number;
};

/**
 * Normalize, validate shape, and dedupe emails from a sheet column.
 * Invalid rows are kept separately (raw trimmed values).
 * Emails that appear more than once are listed in `duplicates`.
 */
export function classifySheetEmails(
  rawEmails: string[],
  isValidEmail: (email: string) => boolean,
): EmailCheckClassification {
  const uniqueEmails: string[] = [];
  const counts = new Map<string, number>();
  const invalid: string[] = [];

  for (const raw of rawEmails) {
    const trimmed = String(raw ?? "").trim();
    if (!trimmed) continue;

    const normalized = normalizeCheckEmail(trimmed);
    if (!isValidEmail(normalized)) {
      invalid.push(trimmed);
      continue;
    }

    const next = (counts.get(normalized) ?? 0) + 1;
    counts.set(normalized, next);
    if (next === 1) {
      uniqueEmails.push(normalized);
    }
  }

  const duplicates: EmailSheetDuplicate[] = [];
  let duplicateInSheet = 0;
  for (const email of uniqueEmails) {
    const count = counts.get(email) ?? 1;
    if (count > 1) {
      duplicates.push({ email, count });
      duplicateInSheet += count - 1;
    }
  }

  return { uniqueEmails, invalid, duplicates, duplicateInSheet };
}

export type EmailCheckResultPayload = {
  summary: {
    totalRows: number;
    uniqueEmails: number;
    existingCount: number;
    missingCount: number;
    invalidCount: number;
    duplicateInSheet: number;
    duplicateEmails: number;
  };
  existing: Array<{
    email: string;
    leadId: string;
    name: string;
  }>;
  missing: string[];
  invalid: string[];
  duplicates: EmailSheetDuplicate[];
};

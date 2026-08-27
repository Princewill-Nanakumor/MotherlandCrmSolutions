/** Hard cap for a single import upload / API batch (not subscription maxLeads). */
export const MAX_LEADS_PER_IMPORT = 50_000;

export function perImportLimitMessage(attempted: number): string {
  return (
    `You can import at most ${MAX_LEADS_PER_IMPORT.toLocaleString()} leads per upload. ` +
    `Your file has ${attempted.toLocaleString()} leads — split it into smaller files and try again.`
  );
}

/** Returns an error message when `count` exceeds the per-upload cap. */
export function getPerImportLimitError(
  count: number,
): string | null {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) {
    return "Invalid lead count for import";
  }
  if (n > MAX_LEADS_PER_IMPORT) {
    return perImportLimitMessage(Math.floor(n));
  }
  return null;
}

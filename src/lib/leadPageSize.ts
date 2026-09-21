/** Default Show-entries size (first even option). */
export const DEFAULT_LEAD_PAGE_SIZE = 20;
export const MAX_LEAD_PAGE_SIZE = 500;

/** Even page sizes from 20 to 500. */
export const LEAD_PAGE_SIZE_OPTIONS: number[] = Array.from(
  { length: (MAX_LEAD_PAGE_SIZE - DEFAULT_LEAD_PAGE_SIZE) / 20 + 1 },
  (_, i) => DEFAULT_LEAD_PAGE_SIZE + i * 20,
);

export const LEAD_PAGE_SIZE_SELECT_OPTIONS = LEAD_PAGE_SIZE_OPTIONS.map(
  (size) => ({
    value: size.toString(),
    label: size.toString(),
  }),
);

export function clampLeadPageSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_LEAD_PAGE_SIZE;
  return Math.min(MAX_LEAD_PAGE_SIZE, Math.max(1, Math.trunc(size)));
}

export function parseLeadPageSize(raw: string | null | undefined): number {
  if (raw == null || raw === "") return DEFAULT_LEAD_PAGE_SIZE;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return DEFAULT_LEAD_PAGE_SIZE;
  return clampLeadPageSize(parsed);
}

export function leadEntriesRange(
  pageIndex: number,
  pageSize: number,
  total: number,
): { start: number; end: number } {
  if (total <= 0) return { start: 0, end: 0 };
  return {
    start: pageIndex * pageSize + 1,
    end: Math.min((pageIndex + 1) * pageSize, total),
  };
}

/** Map any size onto the Show dropdown (15 → 20, 30 → 40). */
export function snapLeadPageSize(size: number): number {
  const clamped = clampLeadPageSize(size);
  if (LEAD_PAGE_SIZE_OPTIONS.includes(clamped)) return clamped;
  return (
    LEAD_PAGE_SIZE_OPTIONS.find((option) => option >= clamped) ??
    MAX_LEAD_PAGE_SIZE
  );
}

export function parseLeadPageSizeOption(
  raw: string | null | undefined,
): number {
  return snapLeadPageSize(parseLeadPageSize(raw));
}

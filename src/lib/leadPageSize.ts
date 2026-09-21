/** Default Show-entries size (first even option). */
export const DEFAULT_LEAD_PAGE_SIZE = 20;
export const MAX_LEAD_PAGE_SIZE = 500;
/** All-leads Show list continues past 500 through 1000. */
export const ALL_LEADS_MAX_PAGE_SIZE = 1000;
const LEAD_PAGE_SIZE_STEP = 20;

function evenPageSizeOptions(max: number): number[] {
  return Array.from(
    { length: (max - DEFAULT_LEAD_PAGE_SIZE) / LEAD_PAGE_SIZE_STEP + 1 },
    (_, i) => DEFAULT_LEAD_PAGE_SIZE + i * LEAD_PAGE_SIZE_STEP,
  );
}

function toSelectOptions(sizes: number[]) {
  return sizes.map((size) => ({
    value: size.toString(),
    label: size.toString(),
  }));
}

/** Even page sizes from 20 to 500 (My Leads, users). */
export const LEAD_PAGE_SIZE_OPTIONS: number[] =
  evenPageSizeOptions(MAX_LEAD_PAGE_SIZE);

/** Even page sizes from 20 to 1000 (All Leads only). */
export const ALL_LEADS_PAGE_SIZE_OPTIONS: number[] = evenPageSizeOptions(
  ALL_LEADS_MAX_PAGE_SIZE,
);

export const LEAD_PAGE_SIZE_SELECT_OPTIONS = toSelectOptions(
  LEAD_PAGE_SIZE_OPTIONS,
);

export const ALL_LEADS_PAGE_SIZE_SELECT_OPTIONS = toSelectOptions(
  ALL_LEADS_PAGE_SIZE_OPTIONS,
);

export function clampLeadPageSize(
  size: number,
  max: number = MAX_LEAD_PAGE_SIZE,
): number {
  if (!Number.isFinite(size)) return DEFAULT_LEAD_PAGE_SIZE;
  return Math.min(max, Math.max(1, Math.trunc(size)));
}

export function parseLeadPageSize(
  raw: string | null | undefined,
  max: number = MAX_LEAD_PAGE_SIZE,
): number {
  if (raw == null || raw === "") return DEFAULT_LEAD_PAGE_SIZE;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return DEFAULT_LEAD_PAGE_SIZE;
  return clampLeadPageSize(parsed, max);
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
export function snapLeadPageSize(
  size: number,
  options: number[] = LEAD_PAGE_SIZE_OPTIONS,
): number {
  const max = options.at(-1) ?? MAX_LEAD_PAGE_SIZE;
  const clamped = clampLeadPageSize(size, max);
  if (options.includes(clamped)) return clamped;
  return options.find((option) => option >= clamped) ?? max;
}

export function parseLeadPageSizeOption(
  raw: string | null | undefined,
  options: number[] = LEAD_PAGE_SIZE_OPTIONS,
): number {
  const max = options.at(-1) ?? MAX_LEAD_PAGE_SIZE;
  return snapLeadPageSize(parseLeadPageSize(raw, max), options);
}

export function snapAllLeadsPageSize(size: number): number {
  return snapLeadPageSize(size, ALL_LEADS_PAGE_SIZE_OPTIONS);
}

export function parseAllLeadsPageSizeOption(
  raw: string | null | undefined,
): number {
  return parseLeadPageSizeOption(raw, ALL_LEADS_PAGE_SIZE_OPTIONS);
}

import type { QueryClient } from "@tanstack/react-query";

/**
 * Filter dropdown metadata — separate from lead list data under ["leads", ...].
 * Broad invalidateQueries({ queryKey: ["leads"] }) must not touch these.
 */
export const leadFilterKeys = {
  all: ["leadFilterOptions"] as const,
  sources: () => ["leadFilterOptions", "sources"] as const,
  countries: () => ["leadFilterOptions", "countries"] as const,
};

/** @deprecated Prefer leadFilterKeys.sources() */
export const LEAD_SOURCES_QUERY_KEY = leadFilterKeys.sources();
/** @deprecated Prefer leadFilterKeys.countries() */
export const LEAD_COUNTRIES_QUERY_KEY = leadFilterKeys.countries();

/** Reference data — rarely changes; keep warm for an hour. */
export const LEAD_FILTER_OPTIONS_STALE_MS = 60 * 60 * 1000;
export const LEAD_FILTER_OPTIONS_GC_MS = 24 * 60 * 60 * 1000;

/**
 * Mark source/country dropdowns stale after create/import.
 * Active observers refetch; do not call on status/assignment/activity events.
 */
export async function refetchLeadFilterOptions(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: [...leadFilterKeys.all],
  });
}

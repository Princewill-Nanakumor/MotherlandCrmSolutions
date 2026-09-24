import type { QueryClient } from "@tanstack/react-query";

export const LEAD_SOURCES_QUERY_KEY = ["leads", "sources"] as const;
export const LEAD_COUNTRIES_QUERY_KEY = ["leads", "countries"] as const;

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
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [...LEAD_SOURCES_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [...LEAD_COUNTRIES_QUERY_KEY] }),
  ]);
}

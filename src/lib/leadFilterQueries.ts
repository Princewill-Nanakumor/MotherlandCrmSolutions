import type { QueryClient } from "@tanstack/react-query";

export const LEAD_SOURCES_QUERY_KEY = ["leads", "sources"] as const;
export const LEAD_COUNTRIES_QUERY_KEY = ["leads", "countries"] as const;

/** Refresh source/country dropdowns after leads are created or imported. */
export async function refetchLeadFilterOptions(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: [...LEAD_SOURCES_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [...LEAD_COUNTRIES_QUERY_KEY] }),
    queryClient.refetchQueries({
      queryKey: [...LEAD_SOURCES_QUERY_KEY],
      type: "active",
    }),
    queryClient.refetchQueries({
      queryKey: [...LEAD_COUNTRIES_QUERY_KEY],
      type: "active",
    }),
  ]);
}

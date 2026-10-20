import type { QueryClient } from "@tanstack/react-query";
import { refetchLeadFilterOptions } from "@/lib/leadFilterQueries";

/**
 * Force all-leads / assigned-leads tables + stats to refresh after mutations
 * that change membership (create, import, delete).
 *
 * Invalidate alone is not enough: the all-leads query uses refetchOnMount:false
 * and placeholderData, so the UI keeps the old page until a refetch completes.
 */
export async function invalidateAndRefetchLeadLists(
  queryClient: QueryClient,
  options?: { includeFilterOptions?: boolean },
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: (query) => {
        const root = Array.isArray(query.queryKey) ? query.queryKey[0] : null;
        return root === "leads" || root === "assignedLeads";
      },
    }),
    queryClient.invalidateQueries({
      queryKey: ["leads-stats"],
      exact: false,
    }),
  ]);

  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["leads"], type: "all" }),
    queryClient.refetchQueries({
      queryKey: ["leads-stats"],
      exact: false,
      type: "all",
    }),
    options?.includeFilterOptions === false
      ? Promise.resolve()
      : refetchLeadFilterOptions(queryClient),
  ]);
}

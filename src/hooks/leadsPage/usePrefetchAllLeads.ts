import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useLeadsStore } from "@/stores/leadsStore";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import {
  ALL_LEADS_QUERY_STALE_MS,
  buildAllLeadsQueryKey,
  fetchAllLeadsPage,
  resolveAllLeadsQueryFilters,
} from "@/lib/allLeadsListQuery";

/**
 * Start GET /api/leads/all from the thin all-leads page shell so the request
 * runs in parallel with the LeadsPageContent chunk download (~770ms hydration).
 */
export function usePrefetchAllLeads(searchQuery: string) {
  const { status, data: session } = useSession();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const filterByUser = useLeadsStore((state) => state.filterByUser);

  useEffect(() => {
    if (!hasAuthorizedSession(status, session) || !searchParams) return;

    const filters = resolveAllLeadsQueryFilters(
      searchParams,
      searchQuery,
      filterByUser,
    );
    const queryKey = buildAllLeadsQueryKey(filters);

    void queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchAllLeadsPage(filters),
      staleTime: ALL_LEADS_QUERY_STALE_MS,
    });
  }, [status, session, searchParams, searchQuery, filterByUser, queryClient]);
}

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { canAccessAllLeads } from "@/lib/roles";
import { useSearchContext } from "@/context/SearchContext";
import {
  ASSIGNED_LEADS_QUERY_STALE_MS,
  buildAssignedLeadsQueryKey,
  fetchAssignedLeadsPage,
  resolveAssignedLeadsQueryFilters,
} from "@/lib/assignedLeadsQuery";

/**
 * Start GET /api/leads/assigned from the thin agent page shell so the request
 * runs in parallel with the UserLeadsContent chunk download.
 */
export function usePrefetchAssignedLeads() {
  const { status, data: session } = useSession();
  const searchParams = useSearchParams();
  const { searchQuery } = useSearchContext();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasAuthorizedSession(status, session) || !session?.user?.id) return;
    if (canAccessAllLeads(session.user)) return;
    if (!searchParams) return;

    const filters = resolveAssignedLeadsQueryFilters(searchParams, searchQuery);
    const queryKey = buildAssignedLeadsQueryKey(session.user.id, filters);

    void queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchAssignedLeadsPage(filters),
      staleTime: ASSIGNED_LEADS_QUERY_STALE_MS,
    });
  }, [status, session, searchParams, searchQuery, queryClient]);
}

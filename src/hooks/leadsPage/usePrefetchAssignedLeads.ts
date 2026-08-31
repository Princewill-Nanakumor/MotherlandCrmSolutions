import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { canAccessAllLeads } from "@/lib/roles";
import {
  ASSIGNED_LEADS_QUERY_STALE_MS,
  assignedLeadsKeys,
  fetchAssignedLeads,
} from "@/lib/assignedLeadsQuery";

/**
 * Start GET /api/leads/assigned from the thin agent page shell so the request
 * runs in parallel with the UserLeadsContent chunk download.
 */
export function usePrefetchAssignedLeads() {
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hasAuthorizedSession(status, session) || !session?.user?.id) return;
    if (canAccessAllLeads(session.user)) return;

    void queryClient.prefetchQuery({
      queryKey: assignedLeadsKeys.list(session.user.id),
      queryFn: fetchAssignedLeads,
      staleTime: ASSIGNED_LEADS_QUERY_STALE_MS,
    });
  }, [status, session, queryClient]);
}

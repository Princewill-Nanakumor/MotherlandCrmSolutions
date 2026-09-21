import type { QueryClient } from "@tanstack/react-query";

export type TimelineRefreshOptions = { force?: boolean };

function leadRowsFromListData(
  data: unknown,
): Array<{ _id?: string; id?: string }> {
  if (Array.isArray(data)) {
    return data as Array<{ _id?: string; id?: string }>;
  }
  if (data && typeof data === "object") {
    const typed = data as { leads?: unknown; assignedLeads?: unknown };
    if (Array.isArray(typed.leads)) {
      return typed.leads as Array<{ _id?: string; id?: string }>;
    }
    if (Array.isArray(typed.assignedLeads)) {
      return typed.assignedLeads as Array<{ _id?: string; id?: string }>;
    }
  }
  return [];
}

/** True when this browser already has the lead on screen or in list/timeline cache. */
export function viewerKnowsLead(
  queryClient: QueryClient,
  leadId: string,
): boolean {
  if (!leadId) return false;

  for (const root of ["activities", "comments", "reminders", "lead"] as const) {
    if (queryClient.getQueryState([root, leadId])) return true;
  }

  return queryClient
    .getQueriesData({
      predicate: (query) => {
        const root = query.queryKey[0];
        return root === "leads" || root === "assignedLeads";
      },
    })
    .some(([, data]) =>
      leadRowsFromListData(data).some(
        (row) => row._id === leadId || row.id === leadId,
      ),
    );
}

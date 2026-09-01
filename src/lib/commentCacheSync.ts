import type { QueryClient } from "@tanstack/react-query";
import type { Comment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/types";
import { transformComment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/utils";
import type { Lead } from "@/types/leads";

/** Keep leads / assignedLeads list rows in sync when comment data changes. */
export function patchLeadListCachesFromComments(
  queryClient: QueryClient,
  leadId: string,
  nextComments: Comment[],
): void {
  const latestComment =
    nextComments.length > 0
      ? [...nextComments].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]
      : undefined;

  const patchLeadArray = (rows: Lead[] = []): Lead[] =>
    rows.map((lead) => {
      if (lead._id !== leadId) return lead;

      const nextLastComment = latestComment?.content;
      const nextLastCommentDate = latestComment?.createdAt;
      const fallbackActivityAt =
        lead.statusChangedAt || lead.updatedAt || lead.createdAt;

      return {
        ...lead,
        lastComment: nextLastComment,
        lastCommentDate: nextLastCommentDate,
        lastActivityAt: nextLastCommentDate || fallbackActivityAt,
        commentCount: Math.max(0, nextComments.length),
      };
    });

  const patchUnknownShape = (oldData: unknown): unknown => {
    if (Array.isArray(oldData)) {
      return patchLeadArray(oldData as Lead[]);
    }

    if (oldData && typeof oldData === "object") {
      const typed = oldData as {
        leads?: Lead[];
        data?: Lead[];
      };

      if (Array.isArray(typed.leads)) {
        return { ...typed, leads: patchLeadArray(typed.leads) };
      }

      if (Array.isArray(typed.data)) {
        return { ...typed, data: patchLeadArray(typed.data) };
      }
    }

    return oldData;
  };

  queryClient.setQueriesData(
    {
      predicate: (query) =>
        query.queryKey[0] === "leads" || query.queryKey[0] === "assignedLeads",
    },
    patchUnknownShape,
  );
}

/** Fetch latest comments and push into React Query + list caches (works when query is inactive). */
export async function refreshCommentsCacheForLead(
  queryClient: QueryClient,
  leadId: string,
): Promise<Comment[] | null> {
  if (!leadId) return null;

  try {
    const response = await fetch(`/api/leads/${leadId}/comments`, {
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const comments = (Array.isArray(data) ? data : []).map(transformComment);
    queryClient.setQueryData(["comments", leadId], comments);
    patchLeadListCachesFromComments(queryClient, leadId, comments);
    return comments;
  } catch {
    return null;
  }
}

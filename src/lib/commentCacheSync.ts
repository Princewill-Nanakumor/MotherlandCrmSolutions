import type { QueryClient } from "@tanstack/react-query";
import type { Comment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/types";
import { transformComment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/utils";
import { removeTimelineRowsById, timelineRowId, upsertTimelineRowsById } from "@/lib/timelineCacheMerge";
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

/** Drop a deleted comment immediately — do not refetch, which can restore it. */
export function patchCommentDeletedInCache(
  queryClient: QueryClient,
  leadId: string,
  commentId: string,
): void {
  if (!leadId || !commentId) return;
  const nextComments = removeTimelineRowsById(
    queryClient.getQueryData<Comment[]>(["comments", leadId]),
    [commentId],
    (comment) => timelineRowId(comment._id),
  );
  queryClient.setQueryData(["comments", leadId], nextComments);
  patchLeadListCachesFromComments(queryClient, leadId, nextComments);
}

/** Fetch latest comments and upsert into React Query + list caches (open or closed panel). */
export async function refreshCommentsCacheForLead(
  queryClient: QueryClient,
  leadId: string,
): Promise<Comment[] | null> {
  if (!leadId) return null;

  try {
    const response = await fetch(`/api/leads/${leadId}/comments`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const comments = (Array.isArray(data) ? data : []).map(transformComment);
    let merged = comments;
    queryClient.setQueryData(["comments", leadId], (old: Comment[] | undefined) => {
      merged = upsertTimelineRowsById(
        old,
        comments,
        (comment) => timelineRowId(comment._id),
      );
      return merged;
    });
    patchLeadListCachesFromComments(queryClient, leadId, merged);
    return merged;
  } catch {
    return null;
  }
}

/**
 * Write fresh comments into cache for open AND closed panels.
 *
 * Do not invalidateQueries here: a competing React Query refetch (queryFn
 * without cache: "no-store") can overwrite this payload with a stale GET.
 * setQueryData updates active observers immediately and leaves inactive
 * cache ready so reopen skips the spinner and still shows the new row.
 */
export async function invalidateLeadCommentsTimeline(
  queryClient: QueryClient,
  leadId: string,
): Promise<void> {
  if (!leadId) return;

  const comments = await refreshCommentsCacheForLead(queryClient, leadId);
  if (!comments) {
    await queryClient.refetchQueries({
      queryKey: ["comments", leadId],
      exact: true,
      type: "all",
    });
    const cached = queryClient.getQueryData<Comment[]>(["comments", leadId]);
    if (cached) {
      patchLeadListCachesFromComments(queryClient, leadId, cached);
    }
  }
}

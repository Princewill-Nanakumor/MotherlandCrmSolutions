import type { QueryClient } from "@tanstack/react-query";
import type { Activity } from "@/types/leads";
import type { Comment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/types";
import { transformComment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/utils";

/** First paint page size for panel activities. */
export const PANEL_ACTIVITIES_FIRST_PAGE_LIMIT = 40;

export async function fetchPanelComments(leadId: string): Promise<Comment[]> {
  const response = await fetch(`/api/leads/${leadId}/comments`, {
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch comments: ${response.status}`);
  }
  const data = await response.json();
  return data.map(transformComment);
}

export async function fetchPanelActivities(leadId: string): Promise<Activity[]> {
  const response = await fetch(
    `/api/leads/${leadId}/activities?limit=${PANEL_ACTIVITIES_FIRST_PAGE_LIMIT}`,
    { cache: "no-store", credentials: "same-origin" },
  );
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Failed to fetch activities: ${response.status}`);
  }
  const responseData = await response.json();
  return Array.isArray(responseData) ? responseData : [];
}

/**
 * Warm comments + activities caches as soon as a row is clicked so the
 * timeline chunk mounts into warm React Query data.
 */
export function prefetchLeadPanelTimeline(
  queryClient: QueryClient,
  leadId: string,
): void {
  if (!leadId) return;

  void queryClient.prefetchQuery({
    queryKey: ["comments", leadId],
    queryFn: () => fetchPanelComments(leadId),
    staleTime: 30 * 1000,
  });

  void queryClient.prefetchQuery({
    queryKey: ["activities", leadId],
    queryFn: () => fetchPanelActivities(leadId),
    staleTime: 30 * 1000,
  });
}

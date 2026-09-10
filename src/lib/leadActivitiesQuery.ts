import type { QueryClient } from "@tanstack/react-query";
import { removeTimelineRowsById, timelineRowId, upsertTimelineRowsById } from "@/lib/timelineCacheMerge";
import type { Activity, Lead } from "@/types/leads";

export function getAssignedUserId(assignedTo: Lead["assignedTo"]): string | null {
  if (!assignedTo) return null;
  if (typeof assignedTo === "string") return assignedTo;
  if (typeof assignedTo === "object") {
    const obj = assignedTo as { id?: string; _id?: string };
    return obj.id ?? obj._id ?? null;
  }
  return null;
}

export function assignedToEquals(
  a: Lead["assignedTo"],
  b: Lead["assignedTo"] | undefined,
): boolean {
  return getAssignedUserId(a) === getAssignedUserId(b);
}

/** Pull the activity timeline and write it into cache (open or closed panel). */
export async function refreshActivitiesCacheForLead(
  queryClient: QueryClient,
  leadId: string,
): Promise<Activity[] | null> {
  if (!leadId) return null;

  try {
    const response = await fetch(`/api/leads/${leadId}/activities?limit=100`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (!response.ok) return null;

    const responseData = await response.json();
    const activities = (
      Array.isArray(responseData) ? responseData : []
    ) as Activity[];
    let merged = activities;
    queryClient.setQueryData(
      ["activities", leadId],
      (old: Activity[] | undefined) => {
        merged = upsertTimelineRowsById(old, activities, (activity) =>
          timelineRowId(activity._id),
        );
        return merged;
      },
    );
    return merged;
  } catch {
    return null;
  }
}

/** Drop a deleted activity immediately — do not refetch, which can restore it. */
export function patchActivityDeletedInCache(
  queryClient: QueryClient,
  leadId: string,
  activityId: string,
): void {
  if (!leadId || !activityId) return;
  queryClient.setQueryData(["activities", leadId], (old: Activity[] | undefined) =>
    removeTimelineRowsById(old, [activityId], (activity) =>
      timelineRowId(activity._id),
    ),
  );
}

/** Refetch activity timelines even when the details panel is on another tab. */
export async function refetchLeadActivities(
  queryClient: QueryClient,
  leadIds: string[],
): Promise<void> {
  await Promise.all(
    leadIds.map((leadId) =>
      queryClient.refetchQueries({
        queryKey: ["activities", leadId],
        type: "all",
      }),
    ),
  );
}

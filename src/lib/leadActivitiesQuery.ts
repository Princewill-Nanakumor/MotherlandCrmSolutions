import type { QueryClient } from "@tanstack/react-query";
import {
  isActivitiesQueryActive,
  type TimelineRefreshOptions,
} from "@/lib/leadTimelineAccess";
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

function statusChangeKey(activity: Activity): string {
  return `${activity.metadata?.oldStatusId ?? ""}→${activity.metadata?.newStatusId ?? ""}`;
}

/** Drop optimistic STATUS_CHANGE rows once the matching server row is present. */
export function dropReplacedOptimisticStatusActivities(
  activities: Activity[],
): Activity[] {
  const realKeys = new Set(
    activities
      .filter(
        (activity) =>
          activity.type === "STATUS_CHANGE" &&
          !String(activity._id).startsWith("optimistic-"),
      )
      .map(statusChangeKey),
  );
  if (realKeys.size === 0) return activities;

  return activities.filter((activity) => {
    if (
      activity.type !== "STATUS_CHANGE" ||
      !String(activity._id).startsWith("optimistic-")
    ) {
      return true;
    }
    return !realKeys.has(statusChangeKey(activity));
  });
}

/**
 * Pull the activity timeline into cache.
 * Skips the network unless the timeline is being viewed (`force` for the open panel).
 * List membership alone does not trigger a download.
 */
export async function refreshActivitiesCacheForLead(
  queryClient: QueryClient,
  leadId: string,
  options?: TimelineRefreshOptions,
): Promise<Activity[] | null> {
  if (!leadId) return null;
  if (!options?.force && !isActivitiesQueryActive(queryClient, leadId)) {
    return null;
  }

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
        merged = dropReplacedOptimisticStatusActivities(
          upsertTimelineRowsById(old, activities, (activity) =>
            timelineRowId(activity._id),
          ),
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

/** Refetch only timelines that are currently on screen. */
export async function refetchLeadActivities(
  queryClient: QueryClient,
  leadIds: string[],
): Promise<void> {
  await Promise.all(
    leadIds.map((leadId) =>
      queryClient.refetchQueries({
        queryKey: ["activities", leadId],
        type: "active",
      }),
    ),
  );
}

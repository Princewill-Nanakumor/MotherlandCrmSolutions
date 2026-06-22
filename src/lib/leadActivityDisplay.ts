import type { Activity } from "@/types/leads";

export function isTaboolaLeadImportActivity(activity: Activity): boolean {
  if (activity.type !== "LEAD_CREATED" && activity.type !== "IMPORT") {
    return false;
  }

  const source = String(activity.metadata?.source ?? "").toLowerCase();
  const details = String(activity.description ?? "").toLowerCase();

  return source === "taboola" || details.includes("taboola");
}

export function filterVisibleLeadActivities<T extends Activity>(
  activities: T[],
): T[] {
  return activities.filter((activity) => !isTaboolaLeadImportActivity(activity));
}

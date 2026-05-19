import type { QueryClient } from "@tanstack/react-query";
import type { Lead } from "@/types/leads";

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

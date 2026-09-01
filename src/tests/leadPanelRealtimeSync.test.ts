import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  collectEventLeadIds,
  handleAdminLeadPanelEvent,
  isActivityTimelineAdminEvent,
  patchLeadDetailStatusInCache,
  syncActivityTimelineFromAdminEvent,
} from "@/lib/leadPanelRealtimeSync";
import type { Lead } from "@/types/leads";

describe("leadPanelRealtimeSync", () => {
  it("classifies activity timeline admin events", () => {
    expect(isActivityTimelineAdminEvent("status_changed")).toBe(true);
    expect(isActivityTimelineAdminEvent("bulk_status_changed")).toBe(true);
    expect(isActivityTimelineAdminEvent("lead_assigned")).toBe(true);
    expect(isActivityTimelineAdminEvent("activity_deleted")).toBe(true);
    expect(isActivityTimelineAdminEvent("comment_created")).toBe(false);
  });

  it("collects lead ids from single and bulk events", () => {
    expect(
      collectEventLeadIds({
        leadId: "a",
        leadIds: ["b", "a"],
      }),
    ).toEqual(["a", "b"]);
  });

  it("invalidates activities on status_changed without full sync", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const fullSync = vi.fn().mockResolvedValue(undefined);

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "status_changed", leadId: "lead-1", status: "CONTACTED" },
      fullSync,
    );

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["activities", "lead-1"],
      exact: true,
    });
    expect(fullSync).not.toHaveBeenCalled();
  });

  it("removes deleted activity rows from cache", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["activities", "lead-1"],
      [
        { _id: "act-1", type: "STATUS_CHANGE" },
        { _id: "act-2", type: "ASSIGNMENT" },
      ],
    );

    await syncActivityTimelineFromAdminEvent(queryClient, {
      type: "activity_deleted",
      leadId: "lead-1",
      activityId: "act-1",
    });

    expect(
      queryClient.getQueryData<Array<{ _id: string }>>(["activities", "lead-1"]),
    ).toEqual([{ _id: "act-2", type: "ASSIGNMENT" }]);
  });

  it("patches lead detail cache on status_changed", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["lead", "lead-1"], {
      _id: "lead-1",
      status: "NEW",
      firstName: "Ada",
      lastName: "Lovelace",
    } as Lead);

    patchLeadDetailStatusInCache(queryClient, "lead-1", "CONTACTED");

    expect(
      queryClient.getQueryData<Lead>(["lead", "lead-1"])?.status,
    ).toBe("CONTACTED");
  });
});

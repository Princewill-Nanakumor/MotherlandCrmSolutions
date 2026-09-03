import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  collectEventLeadIds,
  handleAdminLeadPanelEvent,
  isActivityTimelineAdminEvent,
  patchLeadDetailStatusInCache,
  syncActivityTimelineFromAdminEvent,
  syncCommentsFromAdminEvent,
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

  it("removes a deleted reminder from cache and refreshes the timeline", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    queryClient.setQueryData(["reminders", "lead-1"], [
      { _id: { $oid: "rem-1" }, title: "Follow-up" },
      { _id: "rem-2", title: "Keep" },
    ]);

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "reminder_deleted", leadId: "lead-1", reminderId: "rem-1" },
      vi.fn(),
    );

    expect(
      queryClient.getQueryData<Array<{ title: string }>>(["reminders", "lead-1"]),
    ).toEqual([{ _id: "rem-2", title: "Keep" }]);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["activities", "lead-1"],
      refetchType: "active",
    });
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

  it("refetches comments on comment_updated for open panel", async () => {
    const queryClient = new QueryClient();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,
        json: async () => [
          {
            _id: "c1",
            content: "edited text",
            createdAt: "2026-01-01T00:00:00.000Z",
            createdBy: {
              _id: "u1",
              firstName: "Admin",
              lastName: "User",
            },
          },
        ],
      } as Response);

    queryClient.setQueryData(["assignedLeads", "agent-1"], {
      leads: [
        {
          _id: "lead-1",
          lastComment: "old text",
        },
      ],
    });

    await syncCommentsFromAdminEvent(queryClient, {
      type: "comment_updated",
      leadId: "lead-1",
      commentId: "c1",
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/leads/lead-1/comments", {
      cache: "no-store",
    });
    expect(
      queryClient.getQueryData<Array<{ content: string }>>(["comments", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "c1", content: "edited text" }),
    ]);
    expect(
      (
        queryClient.getQueryData<{ leads: Array<{ lastComment?: string }> }>([
          "assignedLeads",
          "agent-1",
        ])?.leads ?? []
      )[0]?.lastComment,
    ).toBe("edited text");

    fetchSpy.mockRestore();
  });
});

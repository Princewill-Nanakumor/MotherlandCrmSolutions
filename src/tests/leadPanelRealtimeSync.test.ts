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

function mockJsonFetch(handlers: Record<string, unknown>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    for (const [match, body] of Object.entries(handlers)) {
      if (url.includes(match)) {
        return {
          ok: true,
          json: async () => body,
        } as Response;
      }
    }
    return {
      ok: true,
      json: async () => [],
    } as Response;
  });
}

describe("leadPanelRealtimeSync", () => {
  it("classifies activity timeline admin events", () => {
    expect(isActivityTimelineAdminEvent("status_changed")).toBe(true);
    expect(isActivityTimelineAdminEvent("bulk_status_changed")).toBe(true);
    expect(isActivityTimelineAdminEvent("lead_assigned")).toBe(true);
    expect(isActivityTimelineAdminEvent("activity_deleted")).toBe(true);
    expect(isActivityTimelineAdminEvent("comment_created")).toBe(false);
    expect(isActivityTimelineAdminEvent("call_initiated")).toBe(false);
  });

  it("writes call_initiated into the activities cache without a full leads refetch", async () => {
    const queryClient = new QueryClient();
    const fullSync = vi.fn().mockResolvedValue(undefined);
    queryClient.setQueryData(["activities", "lead-1"], [
      { _id: "old", type: "STATUS_CHANGE" },
    ]);
    const fetchSpy = mockJsonFetch({
      "/activities": [{ _id: "act-1", type: "CALL_INITIATED" }],
    });

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "call_initiated", leadId: "lead-1", activityId: "act-1" },
      fullSync,
    );

    expect(fullSync).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData<Array<{ type: string }>>(["activities", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "act-1", type: "CALL_INITIATED" }),
      expect.objectContaining({ _id: "old", type: "STATUS_CHANGE" }),
    ]);

    fetchSpy.mockRestore();
  });

  it("collects lead ids from single and bulk events", () => {
    expect(
      collectEventLeadIds({
        leadId: "a",
        leadIds: ["b", "a"],
      }),
    ).toEqual(["a", "b"]);
  });

  it("refreshes activities on status_changed without full sync", async () => {
    const queryClient = new QueryClient();
    const fullSync = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = mockJsonFetch({
      "/activities": [{ _id: "act-status", type: "STATUS_CHANGE" }],
    });

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "status_changed", leadId: "lead-1", status: "CONTACTED" },
      fullSync,
    );

    expect(fullSync).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData<Array<{ type: string }>>(["activities", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "act-status", type: "STATUS_CHANGE" }),
    ]);

    fetchSpy.mockRestore();
  });

  it("removes a deleted reminder from cache and refreshes the timeline", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["reminders", "lead-1"], [
      { _id: { $oid: "rem-1" }, title: "Follow-up" },
      { _id: "rem-2", title: "Keep" },
    ]);
    const fetchSpy = mockJsonFetch({
      "/reminders": [{ _id: "rem-2", title: "Keep" }],
      "/activities": [{ _id: "act-rem", type: "REMINDER_DELETED" }],
    });

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "reminder_deleted", leadId: "lead-1", reminderId: "rem-1" },
      vi.fn(),
    );

    expect(
      queryClient.getQueryData<Array<{ title: string }>>(["reminders", "lead-1"]),
    ).toEqual([{ _id: "rem-2", title: "Keep" }]);

    fetchSpy.mockRestore();
  });

  it("writes a remote reminder into cache while the panel is closed", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["reminders", "lead-1"], []);
    const fetchSpy = mockJsonFetch({
      "/reminders": [{ _id: "rem-new", title: "Call back" }],
      "/activities": [{ _id: "act-rem", type: "REMINDER_CREATED" }],
    });

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "reminder_created", leadId: "lead-1", reminderId: "rem-new" },
      vi.fn(),
    );

    expect(
      queryClient.getQueryData<Array<{ title: string }>>(["reminders", "lead-1"]),
    ).toEqual([expect.objectContaining({ _id: "rem-new", title: "Call back" })]);

    fetchSpy.mockRestore();
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

  it("removes a deleted comment immediately without waiting on a comments refetch", async () => {
    const queryClient = new QueryClient();
    const fetchSpy = mockJsonFetch({
      "/comments": [
        {
          _id: "A",
          content: "a",
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: { _id: "u1", firstName: "A", lastName: "A" },
        },
        {
          _id: "B",
          content: "b",
          createdAt: "2026-01-01T00:00:01.000Z",
          createdBy: { _id: "u1", firstName: "A", lastName: "A" },
        },
        {
          _id: "C",
          content: "c",
          createdAt: "2026-01-01T00:00:02.000Z",
          createdBy: { _id: "u1", firstName: "A", lastName: "A" },
        },
      ],
    });
    queryClient.setQueryData(["comments", "lead-1"], [
      {
        _id: "A",
        content: "a",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
      {
        _id: "B",
        content: "b",
        createdAt: "2026-01-01T00:00:01.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
      {
        _id: "C",
        content: "c",
        createdAt: "2026-01-01T00:00:02.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
    ]);

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "comment_deleted", leadId: "lead-1", commentId: "B" },
      vi.fn(),
    );

    expect(
      queryClient.getQueryData<Array<{ _id: string }>>(["comments", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "A" }),
      expect.objectContaining({ _id: "C" }),
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
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
    const fetchSpy = mockJsonFetch({
      "/comments": [
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
    });

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
      credentials: "same-origin",
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

  it("writes comment_created into comments cache for an open panel", async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const fetchSpy = mockJsonFetch({
      "/comments": [
        {
          _id: "c2",
          content: "new comment",
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: {
            _id: "u1",
            firstName: "Agent",
            lastName: "One",
          },
        },
      ],
    });
    const fullSync = vi.fn().mockResolvedValue(undefined);

    await handleAdminLeadPanelEvent(
      queryClient,
      "lead-1",
      { type: "comment_created", leadId: "lead-1", commentId: "c2" },
      fullSync,
    );

    expect(fullSync).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["comments", "lead-1"],
      }),
    );
    expect(
      queryClient.getQueryData<Array<{ content: string }>>(["comments", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "c2", content: "new comment" }),
    ]);

    fetchSpy.mockRestore();
  });

  it("replaces stale closed-panel comment cache so reopen has no spinner and is fresh", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["comments", "lead-1"], [
      {
        _id: "c-old",
        content: "stale",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "B" },
      },
    ]);
    const fetchSpy = mockJsonFetch({
      "/comments": [
        {
          _id: "c-old",
          content: "stale",
          createdAt: "2026-01-01T00:00:00.000Z",
          createdBy: { _id: "u1", firstName: "A", lastName: "B" },
        },
        {
          _id: "c-new",
          content: "from another agent",
          createdAt: "2026-01-01T00:01:00.000Z",
          createdBy: { _id: "u2", firstName: "Agent", lastName: "Two" },
        },
      ],
    });

    await syncCommentsFromAdminEvent(queryClient, {
      type: "comment_created",
      leadId: "lead-1",
      commentId: "c-new",
    });

    expect(
      queryClient.getQueryData<Array<{ _id: string }>>(["comments", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "c-new", content: "from another agent" }),
      expect.objectContaining({ _id: "c-old" }),
    ]);

    fetchSpy.mockRestore();
  });

  it("upserts comment_created onto existing comments instead of replacing them", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["comments", "lead-1"], [
      {
        _id: "A",
        content: "a",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
      {
        _id: "B",
        content: "b",
        createdAt: "2026-01-01T00:00:01.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
      {
        _id: "C",
        content: "c",
        createdAt: "2026-01-01T00:00:02.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
    ]);
    const fetchSpy = mockJsonFetch({
      "/comments": [
        {
          _id: "D",
          content: "new comment",
          createdAt: "2026-01-01T00:00:03.000Z",
          createdBy: { _id: "u2", firstName: "Agent", lastName: "Two" },
        },
      ],
    });

    await syncCommentsFromAdminEvent(queryClient, {
      type: "comment_created",
      leadId: "lead-1",
      commentId: "D",
    });

    expect(
      queryClient.getQueryData<Array<{ _id: string }>>(["comments", "lead-1"]),
    ).toEqual([
      expect.objectContaining({ _id: "D", content: "new comment" }),
      expect.objectContaining({ _id: "A" }),
      expect.objectContaining({ _id: "B" }),
      expect.objectContaining({ _id: "C" }),
    ]);

    fetchSpy.mockRestore();
  });

  it("updates comment B in place without duplicating it", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["comments", "lead-1"], [
      {
        _id: "A",
        content: "a",
        createdAt: "2026-01-01T00:00:00.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
      {
        _id: "B",
        content: "old",
        createdAt: "2026-01-01T00:00:01.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
      {
        _id: "C",
        content: "c",
        createdAt: "2026-01-01T00:00:02.000Z",
        createdBy: { _id: "u1", firstName: "A", lastName: "A" },
      },
    ]);
    const fetchSpy = mockJsonFetch({
      "/comments": [
        {
          _id: "B",
          content: "updated",
          createdAt: "2026-01-01T00:00:01.000Z",
          createdBy: { _id: "u1", firstName: "A", lastName: "A" },
        },
      ],
    });

    await syncCommentsFromAdminEvent(queryClient, {
      type: "comment_updated",
      leadId: "lead-1",
      commentId: "B",
    });

    const cached =
      queryClient.getQueryData<Array<{ _id: string; content: string }>>([
        "comments",
        "lead-1",
      ]) ?? [];
    expect(cached.map((row) => row._id)).toEqual(["A", "B", "C"]);
    expect(cached.find((row) => row._id === "B")?.content).toBe("updated");

    fetchSpy.mockRestore();
  });
});

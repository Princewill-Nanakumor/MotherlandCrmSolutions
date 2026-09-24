import { describe, expect, it } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  isActivitiesQueryActive,
  viewerKnowsLead,
} from "@/lib/leadTimelineAccess";

describe("viewerKnowsLead", () => {
  it("is false for a lead with no cache", () => {
    const queryClient = new QueryClient();
    expect(viewerKnowsLead(queryClient, "lead-1")).toBe(false);
  });

  it("is true when a timeline query exists", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["activities", "lead-1"], []);
    expect(viewerKnowsLead(queryClient, "lead-1")).toBe(true);
  });

  it("is true when the lead is on the assigned list page", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["assignedLeads", "list", "agent-1"], {
      leads: [{ _id: "lead-1" }],
    });
    expect(viewerKnowsLead(queryClient, "lead-1")).toBe(true);
    expect(viewerKnowsLead(queryClient, "lead-2")).toBe(false);
  });
});

describe("isActivitiesQueryActive", () => {
  it("is false when the lead is only on a list cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["leads"], [{ _id: "lead-1" }]);
    expect(viewerKnowsLead(queryClient, "lead-1")).toBe(true);
    expect(isActivitiesQueryActive(queryClient, "lead-1")).toBe(false);
  });

  it("is false when activities data exists but nothing is observing it", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["activities", "lead-1"], []);
    expect(isActivitiesQueryActive(queryClient, "lead-1")).toBe(false);
  });

  it("is true while an activities observer is subscribed", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const observer = new QueryObserver(queryClient, {
      queryKey: ["activities", "lead-1"],
      queryFn: async () => [],
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    expect(isActivitiesQueryActive(queryClient, "lead-1")).toBe(true);
    unsubscribe();
    observer.destroy();
  });
});

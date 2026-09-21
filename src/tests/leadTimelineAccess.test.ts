import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { viewerKnowsLead } from "@/lib/leadTimelineAccess";

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

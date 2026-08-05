import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { applyRemoteLeadStatusToListCaches } from "./leadsListCache";
import type { Lead } from "@/types/leads";

function lead(overrides: Partial<Lead> & { _id: string; status: string }): Lead {
  return {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+1",
    source: "web",
    country: "US",
    comments: "",
    assignedTo: null,
    ...overrides,
  } as unknown as Lead;
}

describe("applyRemoteLeadStatusToListCaches", () => {
  it("updates matching lead status in assignedLeads cache", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(
      ["assignedLeads"],
      [
        lead({ _id: "a", status: "NEW" }),
        lead({ _id: "b", status: "NEW" }),
      ],
    );

    applyRemoteLeadStatusToListCaches(queryClient, "a", "CONTACTED");

    const next = queryClient.getQueryData<Lead[]>(["assignedLeads"]);
    expect(next?.find((l) => l._id === "a")?.status).toBe("CONTACTED");
    expect(next?.find((l) => l._id === "b")?.status).toBe("NEW");
  });

  it("removes lead from include status-filtered all-leads page", () => {
    const queryClient = new QueryClient();
    // ["leads", page, pageSize, user, country[], status[], source[],
    //  countryMode, statusMode, sourceMode, search]
    const key = [
      "leads",
      1,
      25,
      "all",
      [],
      ["NEW"],
      [],
      "include",
      "include",
      "include",
      "",
    ];

    queryClient.setQueryData(key, {
      leads: [lead({ _id: "a", status: "NEW" }), lead({ _id: "b", status: "NEW" })],
      total: 2,
    });

    applyRemoteLeadStatusToListCaches(queryClient, "a", "CONTACTED");

    const next = queryClient.getQueryData<{ leads: Lead[]; total: number }>(key);
    expect(next?.leads.map((l) => l._id)).toEqual(["b"]);
    expect(next?.total).toBe(1);
  });

  it("no-ops on empty lead id", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["assignedLeads"], [lead({ _id: "a", status: "NEW" })]);
    applyRemoteLeadStatusToListCaches(queryClient, "", "CONTACTED");
    expect(queryClient.getQueryData<Lead[]>(["assignedLeads"])?.[0].status).toBe(
      "NEW",
    );
  });
});

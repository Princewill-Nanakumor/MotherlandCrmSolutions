import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { applyRemoteLeadStatusToListCaches } from "@/lib/leadsListCache";
import { refetchLeadFilterOptions } from "@/lib/leadFilterQueries";
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

describe("React Query cache behaviors", () => {
  it("optimistic-style remote status patch updates assigned cache immediately", () => {
    const qc = new QueryClient();
    qc.setQueryData(["assignedLeads"], [lead({ _id: "1", status: "NEW" })]);

    applyRemoteLeadStatusToListCaches(qc, "1", "WON", { touchActivity: true });

    const next = qc.getQueryData<Lead[]>(["assignedLeads"])![0];
    expect(next.status).toBe("WON");
    expect(next.statusChangedAt).toBeTruthy();
    expect(next.lastActivityAt).toBeTruthy();
  });

  it("refetchLeadFilterOptions invalidates source/country keys", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let sourcesFetches = 0;
    qc.setQueryDefaults(["leads", "sources"], {
      queryFn: async () => {
        sourcesFetches += 1;
        return ["web"];
      },
    });
    qc.setQueryDefaults(["leads", "countries"], {
      queryFn: async () => ["US"],
    });

    await qc.fetchQuery({ queryKey: ["leads", "sources"] });
    await qc.fetchQuery({ queryKey: ["leads", "countries"] });
    expect(sourcesFetches).toBe(1);

    await refetchLeadFilterOptions(qc);
    expect(qc.getQueryState(["leads", "sources"])?.isInvalidated).toBe(true);
  });
});

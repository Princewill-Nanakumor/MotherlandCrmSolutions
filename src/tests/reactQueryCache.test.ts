import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { applyRemoteLeadStatusToListCaches } from "@/lib/leadsListCache";
import {
  leadFilterKeys,
  refetchLeadFilterOptions,
} from "@/lib/leadFilterQueries";
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

  it("refetchLeadFilterOptions invalidates source/country keys without forcing a double fetch", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let sourcesFetches = 0;
    const sourcesKey = [...leadFilterKeys.sources()];
    const countriesKey = [...leadFilterKeys.countries()];

    qc.setQueryDefaults(sourcesKey, {
      queryFn: async () => {
        sourcesFetches += 1;
        return ["web"];
      },
    });
    qc.setQueryDefaults(countriesKey, {
      queryFn: async () => ["US"],
    });

    await qc.fetchQuery({ queryKey: sourcesKey });
    await qc.fetchQuery({ queryKey: countriesKey });
    expect(sourcesFetches).toBe(1);

    await refetchLeadFilterOptions(qc);
    expect(qc.getQueryState(sourcesKey)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(countriesKey)?.isInvalidated).toBe(true);
    expect(sourcesFetches).toBe(1);
  });

  it("invalidate ['leads'] does not invalidate leadFilterOptions sources/countries", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const sourcesKey = [...leadFilterKeys.sources()];
    const countriesKey = [...leadFilterKeys.countries()];
    const leadsKey = ["leads", 1, 50] as const;

    qc.setQueryDefaults([...leadsKey], {
      queryFn: async () => ({ leads: [] }),
    });
    qc.setQueryDefaults(sourcesKey, {
      queryFn: async () => ["web"],
    });
    qc.setQueryDefaults(countriesKey, {
      queryFn: async () => ["US"],
    });

    await qc.fetchQuery({ queryKey: [...leadsKey] });
    await qc.fetchQuery({ queryKey: sourcesKey });
    await qc.fetchQuery({ queryKey: countriesKey });

    await qc.invalidateQueries({ queryKey: ["leads"] });

    expect(qc.getQueryState([...leadsKey])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(sourcesKey)?.isInvalidated).toBe(false);
    expect(qc.getQueryState(countriesKey)?.isInvalidated).toBe(false);
  });

  it("invalidate ['leadFilterOptions'] marks sources and countries stale", async () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const sourcesKey = [...leadFilterKeys.sources()];
    const countriesKey = [...leadFilterKeys.countries()];

    qc.setQueryDefaults(sourcesKey, {
      queryFn: async () => ["web"],
    });
    qc.setQueryDefaults(countriesKey, {
      queryFn: async () => ["US"],
    });

    await qc.fetchQuery({ queryKey: sourcesKey });
    await qc.fetchQuery({ queryKey: countriesKey });

    await qc.invalidateQueries({ queryKey: [...leadFilterKeys.all] });

    expect(qc.getQueryState(sourcesKey)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(countriesKey)?.isInvalidated).toBe(true);
  });
});

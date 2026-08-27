import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import {
  MAX_LEADS_PER_IMPORT,
  getPerImportLimitError,
} from "@/lib/importBatchLimits";
import { SUBSCRIPTION_PLAN_CATALOG } from "@/lib/subscriptionPlanCatalog";
import { checkTenantLeadImportAllowed } from "@/lib/tenantLeadImportLimits";

function mockDb(options: {
  currentLeads: number;
  maxLeads: number;
}) {
  return {
    collection: (name: string) => {
      if (name === "leads") {
        return {
          countDocuments: async () => options.currentLeads,
          deleteMany: async () => ({ deletedCount: 0 }),
        };
      }
      if (name === "users") {
        return {
          findOne: async () => ({
            subscriptionStatus: "active",
            subscriptionEndDate: new Date(Date.now() + 86_400_000),
            maxLeads: options.maxLeads,
          }),
        };
      }
      return {
        findOne: async () => null,
        countDocuments: async () => 0,
      };
    },
  };
}

describe("subscription plans vs per-upload import cap", () => {
  it("catalog: Starter 10k, Professional 30k, Enterprise unlimited (-1)", () => {
    expect(SUBSCRIPTION_PLAN_CATALOG.starter.maxLeads).toBe(10_000);
    expect(SUBSCRIPTION_PLAN_CATALOG.professional.maxLeads).toBe(30_000);
    expect(SUBSCRIPTION_PLAN_CATALOG.enterprise.maxLeads).toBe(-1);
    expect(SUBSCRIPTION_PLAN_CATALOG.enterprise.maxUsers).toBe(-1);
  });

  it("50k is a per-upload hard cap, not the subscription total", () => {
    expect(MAX_LEADS_PER_IMPORT).toBe(50_000);
    expect(getPerImportLimitError(50_000)).toBeNull();
    expect(getPerImportLimitError(50_001)).toMatch(/per upload/i);
  });

  it("Starter can import up to remaining plan slots, still blocked by 50k/file", async () => {
    const adminObjectId = new ObjectId();
    const maxLeads = SUBSCRIPTION_PLAN_CATALOG.starter.maxLeads;
    const db = mockDb({ currentLeads: 9_500, maxLeads });

    const ok = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 500,
    });
    expect(ok).toEqual({ ok: true, currentLeads: 9_500, maxLeads: 10_000 });

    const blocked = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 501,
    });
    expect(blocked.ok).toBe(false);

    // A 50k file is larger than Starter's total plan, so plan check fails first
    expect(getPerImportLimitError(50_000)).toBeNull();
    const tooBigForPlan = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 50_000,
    });
    expect(tooBigForPlan.ok).toBe(false);
  });

  it("Enterprise unlimited total still allows huge remaining capacity, but one file cannot exceed 50k", async () => {
    const adminObjectId = new ObjectId();
    const maxLeads = SUBSCRIPTION_PLAN_CATALOG.enterprise.maxLeads;
    expect(maxLeads).toBe(-1);

    const db = mockDb({ currentLeads: 250_000, maxLeads });
    const result = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: MAX_LEADS_PER_IMPORT,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.maxLeads).toBe(-1);
    }

    expect(getPerImportLimitError(MAX_LEADS_PER_IMPORT + 1)).toMatch(
      /50,000.*per upload/i,
    );
  });
});

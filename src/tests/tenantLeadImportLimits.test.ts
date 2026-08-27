import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  checkTenantLeadImportAllowed,
  reconcileLeadQuotaOrRollback,
} from "@/lib/tenantLeadImportLimits";

function mockDb(options: {
  currentLeads: number;
  billingUser: Record<string, unknown> | null;
  deleteMany?: ReturnType<typeof vi.fn>;
}) {
  const deleteMany = options.deleteMany ?? vi.fn().mockResolvedValue({ deletedCount: 0 });
  return {
    collection: (name: string) => {
      if (name === "leads") {
        return {
          countDocuments: vi.fn().mockResolvedValue(options.currentLeads),
          deleteMany,
        };
      }
      if (name === "users") {
        return {
          findOne: vi.fn().mockResolvedValue(options.billingUser),
          countDocuments: vi.fn(),
        };
      }
      return {
        findOne: vi.fn(),
        countDocuments: vi.fn(),
        deleteMany,
      };
    },
  };
}

describe("checkTenantLeadImportAllowed", () => {
  const adminObjectId = new ObjectId();

  it("blocks when trial expired and no active subscription", async () => {
    const db = mockDb({
      currentLeads: 10,
      billingUser: {
        isOnTrial: true,
        trialEndsAt: new Date(Date.now() - 86_400_000),
        subscriptionStatus: "inactive",
        maxLeads: 50,
      },
    });

    const result = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.body.upgradeRequired).toBe(true);
    }
  });

  it("allows active trial under limit", async () => {
    const db = mockDb({
      currentLeads: 10,
      billingUser: {
        isOnTrial: true,
        trialEndsAt: new Date(Date.now() + 86_400_000),
        maxLeads: 50,
      },
    });

    const result = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 5,
    });
    expect(result).toEqual({ ok: true, currentLeads: 10, maxLeads: 50 });
  });

  it("blocks when lead limit would be exceeded", async () => {
    const db = mockDb({
      currentLeads: 48,
      billingUser: {
        isOnTrial: true,
        trialEndsAt: new Date(Date.now() + 86_400_000),
        maxLeads: 50,
      },
    });

    const result = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.body.error).toMatch(/exceed lead limit/i);
    }
  });

  it("allows unlimited maxLeads (-1)", async () => {
    const db = mockDb({
      currentLeads: 10_000,
      billingUser: {
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(Date.now() + 86_400_000),
        maxLeads: -1,
      },
    });

    const result = await checkTenantLeadImportAllowed(db, {
      adminObjectId,
      newLeadCount: 5000,
    });
    expect(result.ok).toBe(true);
  });
});

describe("reconcileLeadQuotaOrRollback", () => {
  it("rolls back overflow inserts when concurrent import exceeds cap", async () => {
    const adminObjectId = new ObjectId();
    const insertedIds = [new ObjectId(), new ObjectId(), new ObjectId()];
    const deleteMany = vi.fn().mockResolvedValue({ deletedCount: 2 });
    const db = mockDb({
      currentLeads: 52,
      billingUser: { maxLeads: 50 },
      deleteMany,
    });

    const result = await reconcileLeadQuotaOrRollback(db, {
      adminObjectId,
      insertedIds,
    });

    expect(result?.status).toBe(403);
    expect(deleteMany).toHaveBeenCalled();
    expect(result?.body.details).toMatchObject({
      maxLeads: 50,
      rolledBack: 2,
    });
  });

  it("returns null when still within quota", async () => {
    const adminObjectId = new ObjectId();
    const db = mockDb({
      currentLeads: 40,
      billingUser: { maxLeads: 50 },
    });

    await expect(
      reconcileLeadQuotaOrRollback(db, {
        adminObjectId,
        insertedIds: [new ObjectId()],
      }),
    ).resolves.toBeNull();
  });
});

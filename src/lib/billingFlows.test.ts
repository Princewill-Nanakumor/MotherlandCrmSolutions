import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { checkTenantLeadImportAllowed } from "./tenantLeadImportLimits";
import {
  getPaymentExpiresAt,
  isPaymentConfirmWindowExpired,
  resolvePaymentExpiresAt,
} from "./paymentConfirmWindow";

function mockDb(billingUser: Record<string, unknown> | null, currentLeads = 0) {
  return {
    collection: (name: string) => {
      if (name === "leads") {
        return {
          countDocuments: vi.fn().mockResolvedValue(currentLeads),
          deleteMany: vi.fn(),
        };
      }
      return {
        findOne: vi.fn().mockResolvedValue(billingUser),
        countDocuments: vi.fn(),
        deleteMany: vi.fn(),
      };
    },
  };
}

describe("billing / subscription edge cases", () => {
  const adminObjectId = new ObjectId();

  it("blocks import when subscription expired (inactive end date)", async () => {
    const result = await checkTenantLeadImportAllowed(
      mockDb({
        isOnTrial: false,
        subscriptionStatus: "active",
        subscriptionEndDate: new Date(Date.now() - 86_400_000),
        maxLeads: 1000,
      }),
      { adminObjectId, newLeadCount: 1 },
    );
    expect(result.ok).toBe(false);
  });

  it("allows import on active paid plan under quota", async () => {
    const result = await checkTenantLeadImportAllowed(
      mockDb(
        {
          isOnTrial: false,
          subscriptionStatus: "active",
          subscriptionEndDate: new Date(Date.now() + 30 * 86_400_000),
          maxLeads: 500,
        },
        100,
      ),
      { adminObjectId, newLeadCount: 50 },
    );
    expect(result).toEqual({ ok: true, currentLeads: 100, maxLeads: 500 });
  });

  it("treats downgrade-style smaller maxLeads as hard cap", async () => {
    const result = await checkTenantLeadImportAllowed(
      mockDb(
        {
          isOnTrial: false,
          subscriptionStatus: "active",
          subscriptionEndDate: new Date(Date.now() + 86_400_000),
          maxLeads: 120,
        },
        120,
      ),
      { adminObjectId, newLeadCount: 1 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.body.details).toMatchObject({
        currentLeads: 120,
        maxLeads: 120,
        remainingSlots: 0,
      });
    }
  });

  it("payment confirm window expires after deadline", () => {
    const created = new Date("2026-08-05T10:00:00.000Z");
    const expires = getPaymentExpiresAt(created);
    expect(
      isPaymentConfirmWindowExpired(expires, new Date("2026-08-05T11:00:00.000Z")),
    ).toBe(true);
    expect(
      resolvePaymentExpiresAt({ createdAt: created })?.toISOString(),
    ).toBe(expires.toISOString());
  });
});

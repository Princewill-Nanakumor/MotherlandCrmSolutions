import { ObjectId } from "mongodb";

type MongoishDb = {
  collection: (name: string) => {
    countDocuments: (filter?: object) => Promise<number>;
    findOne: (
      filter: object,
      options?: object,
    ) => Promise<Record<string, unknown> | null>;
  };
};

const DEFAULT_TRIAL_MAX_LEADS = 50;

export type TenantLeadImportCheck =
  | { ok: true; currentLeads: number; maxLeads: number }
  | { ok: false; status: number; body: Record<string, unknown> };

/**
 * Enforces subscription/trial and max-lead quota for a tenant (admin scope).
 * Always uses the billing admin document at {@link adminObjectId}, not the caller,
 * so agents cannot import under another tenant's limits by mistake.
 */
export async function checkTenantLeadImportAllowed(
  dbRaw: unknown,
  options: {
    adminObjectId: ObjectId;
    newLeadCount: number;
  },
): Promise<TenantLeadImportCheck> {
  const db = dbRaw as MongoishDb;
  const { adminObjectId, newLeadCount } = options;
  const safeNewCount = Math.max(0, newLeadCount);

  const currentLeads = await db
    .collection("leads")
    .countDocuments({ adminId: adminObjectId });

  const billingUser = await db.collection("users").findOne({ _id: adminObjectId });
  if (!billingUser) {
    return {
      ok: false,
      status: 404,
      body: { error: "Tenant admin not found" },
    };
  }

  const isOnTrial =
    Boolean(billingUser.isOnTrial) &&
    billingUser.trialEndsAt &&
    new Date() < new Date(billingUser.trialEndsAt as Date);

  const subscriptionEndDate = billingUser.subscriptionEndDate
    ? new Date(billingUser.subscriptionEndDate as Date)
    : null;
  const subscriptionExpired =
    subscriptionEndDate !== null && new Date() > subscriptionEndDate;
  const hasActiveSubscription =
    billingUser.subscriptionStatus === "active" && !subscriptionExpired;

  const rawMax = billingUser.maxLeads as number | undefined;
  const maxLeads =
    rawMax === -1 ? -1 : (typeof rawMax === "number" ? rawMax : DEFAULT_TRIAL_MAX_LEADS);

  if (!isOnTrial && !hasActiveSubscription) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Trial expired. Please subscribe to continue importing leads.",
        upgradeRequired: true,
      },
    };
  }

  if (
    maxLeads !== -1 &&
    safeNewCount > 0 &&
    currentLeads + safeNewCount > maxLeads
  ) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Import would exceed lead limit",
        details: {
          currentLeads,
          maxLeads,
          attemptingToImport: safeNewCount,
          remainingSlots: Math.max(0, maxLeads - currentLeads),
        },
        upgradeRequired: true,
      },
    };
  }

  return { ok: true, currentLeads, maxLeads };
}

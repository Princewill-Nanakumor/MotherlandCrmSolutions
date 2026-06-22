import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Activity from "@/models/Activity";
import IntegrationLeadReceipt from "@/models/IntegrationLeadReceipt";
import User from "@/models/User";
import {
  checkTenantLeadImportAllowed,
  reconcileLeadQuotaOrRollback,
} from "@/lib/tenantLeadImportLimits";
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import { normalizeCountryInput } from "@/lib/countryNormalize";
import { notifyInboundLeadTelegram } from "@/lib/integrations/telegram";

type LeadSummary = {
  _id: mongoose.Types.ObjectId;
  leadId?: string;
  firstName: string;
  lastName: string;
  email: string;
};

function toLeadSummary(lead: LeadSummary) {
  return {
    _id: String(lead._id),
    leadId: lead.leadId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
  };
}

export interface CreateInboundLeadInput {
  provider: "taboola";
  externalId: string;
  adminId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  comments: string;
  activityDetails: string;
  activityMetadata?: Record<string, unknown>;
}

export type CreateInboundLeadResult =
  | {
      ok: true;
      duplicate: boolean;
      lead: {
        _id: string;
        leadId?: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    }
  | {
      ok: false;
      status: number;
      body: Record<string, unknown>;
    };

export async function createInboundLead(
  input: CreateInboundLeadInput,
): Promise<CreateInboundLeadResult> {
  const adminObjectId = new mongoose.Types.ObjectId(input.adminId);
  const normalizedEmail = input.email.trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      ok: false,
      status: 400,
      body: { error: "Email is required" },
    };
  }

  if (!input.externalId.trim()) {
    return {
      ok: false,
      status: 400,
      body: { error: "ClickID or Email is required for idempotency" },
    };
  }

  const existingReceipt = (await IntegrationLeadReceipt.findOne({
    provider: input.provider,
    externalId: input.externalId.trim(),
    adminId: adminObjectId,
  }).lean()) as { leadId?: mongoose.Types.ObjectId } | null;

  if (existingReceipt?.leadId) {
    const existingLead = (await Lead.findOne({
      _id: existingReceipt.leadId,
      adminId: adminObjectId,
    })
      .select({ _id: 1, leadId: 1, firstName: 1, lastName: 1, email: 1 })
      .lean()) as LeadSummary | null;

    if (existingLead) {
      return {
        ok: true,
        duplicate: true,
        lead: toLeadSummary(existingLead),
      };
    }
  }

  const adminUser = await User.findOne({
    _id: adminObjectId,
    role: "ADMIN",
  })
    .select({ _id: 1 })
    .lean();

  if (!adminUser) {
    return {
      ok: false,
      status: 404,
      body: { error: "Tenant admin not found" },
    };
  }

  if (!mongoose.connection.db) {
    throw new Error("Database connection not available");
  }

  const limitCheck = await checkTenantLeadImportAllowed(mongoose.connection.db, {
    adminObjectId,
    newLeadCount: 1,
  });

  if (!limitCheck.ok) {
    return {
      ok: false,
      status: limitCheck.status,
      body: limitCheck.body,
    };
  }

  try {
    const newLead = await Lead.create({
      firstName: input.firstName.trim() || "Unknown",
      lastName: input.lastName.trim(),
      email: normalizedEmail,
      phone: input.phone.trim(),
      country: normalizeCountryInput(input.country),
      source: input.source.trim() || "Taboola",
      comments: input.comments.trim() || "Imported from Taboola.",
      status: "NEW",
      adminId: adminObjectId,
      createdBy: adminObjectId,
      lastActivityAt: new Date(),
    });

    const overage = await reconcileLeadQuotaOrRollback(mongoose.connection.db, {
      adminObjectId,
      insertedIds: [newLead._id as unknown as import("mongodb").ObjectId],
    });

    if (overage) {
      await IntegrationLeadReceipt.deleteOne({
        provider: input.provider,
        externalId: input.externalId.trim(),
        adminId: adminObjectId,
      }).catch(() => undefined);

      return {
        ok: false,
        status: overage.status,
        body: overage.body,
      };
    }

    await IntegrationLeadReceipt.findOneAndUpdate(
      {
        provider: input.provider,
        externalId: input.externalId.trim(),
        adminId: adminObjectId,
      },
      {
        $setOnInsert: {
          provider: input.provider,
          externalId: input.externalId.trim(),
          adminId: adminObjectId,
          leadId: newLead._id,
          email: normalizedEmail,
        },
      },
      { upsert: true, new: true },
    );

    try {
      await Activity.create({
        type: "LEAD_CREATED",
        userId: adminObjectId,
        leadId: newLead._id,
        adminId: adminObjectId,
        details: input.activityDetails,
        timestamp: new Date(),
        metadata: {
          source: input.source,
          email: normalizedEmail,
          ...(input.activityMetadata ?? {}),
        },
      });
    } catch (activityError) {
      console.error("Failed to log inbound lead activity:", activityError);
    }

    try {
      await publishAdminLeadsUpdatedEvent(input.adminId, {
        type: "lead_created",
        leadId: newLead._id.toString(),
        actorId: input.adminId,
      });
    } catch (publishError) {
      console.error("Ably publish failed after inbound lead creation:", publishError);
    }

    try {
      await notifyInboundLeadTelegram({
        adminId: input.adminId,
        provider: input.provider,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        email: newLead.email,
        phone: newLead.phone ?? input.phone,
        country: newLead.country ?? input.country,
        source: newLead.source ?? input.source,
        leadRef: {
          _id: newLead._id.toString(),
          leadId: newLead.leadId,
        },
      });
    } catch (telegramError) {
      console.error("Telegram notification failed after inbound lead creation:", telegramError);
    }

    return {
      ok: true,
      duplicate: false,
      lead: {
        _id: newLead._id.toString(),
        leadId: newLead.leadId,
        firstName: newLead.firstName,
        lastName: newLead.lastName,
        email: newLead.email,
      },
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      const existingLead = (await Lead.findOne({
        adminId: adminObjectId,
        email: normalizedEmail,
      })
        .select({ _id: 1, leadId: 1, firstName: 1, lastName: 1, email: 1 })
        .lean()) as LeadSummary | null;

      if (existingLead) {
        await IntegrationLeadReceipt.findOneAndUpdate(
          {
            provider: input.provider,
            externalId: input.externalId.trim(),
            adminId: adminObjectId,
          },
          {
            $setOnInsert: {
              provider: input.provider,
              externalId: input.externalId.trim(),
              adminId: adminObjectId,
              leadId: existingLead._id,
              email: normalizedEmail,
            },
          },
          { upsert: true },
        );

        return {
          ok: true,
          duplicate: true,
          lead: toLeadSummary(existingLead),
        };
      }

      return {
        ok: false,
        status: 409,
        body: { error: "A lead with this email already exists" },
      };
    }

    throw error;
  }
}

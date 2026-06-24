import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Status from "@/models/Status";
import IntegrationLeadReceipt from "@/models/IntegrationLeadReceipt";
import { resolveTaboolaAdminId } from "@/lib/integrations/taboola";

const DEFAULT_STATUSES = [
  { id: "NEW", name: "New" },
  { id: "CONTACTED", name: "Contacted" },
  { id: "IN_PROGRESS", name: "In Progress" },
  { id: "QUALIFIED", name: "Qualified" },
  { id: "LOST", name: "Lost" },
  { id: "WON", name: "Won" },
] as const;

export type TaboolaPartnerLead = {
  id: string;
  leadId: string | null;
  clickId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  status: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string | null;
};

export function resolveTaboolaPartnerAdminId(
  url: URL,
): string | null {
  return resolveTaboolaAdminId({
    explicitAdminId: url.searchParams.get("adminId") ?? undefined,
  });
}

export async function getTaboolaStatusValues(
  adminId: string,
): Promise<Array<{ id: string; name: string }>> {
  const adminObjectId = new mongoose.Types.ObjectId(adminId);
  const customStatuses = await Status.find({ adminId: adminObjectId })
    .sort({ createdAt: 1 })
    .select({ name: 1 })
    .lean();

  const values: Array<{ id: string; name: string }> = customStatuses.map(
    (status) => ({
      id: status._id.toString(),
      name: status.name,
    }),
  );

  const knownIds = new Set(values.map((status) => status.id.toUpperCase()));
  const knownNames = new Set(
    values.map((status) => status.name.trim().toLowerCase()),
  );

  for (const fallback of DEFAULT_STATUSES) {
    if (
      !knownIds.has(fallback.id) &&
      !knownNames.has(fallback.name.toLowerCase())
    ) {
      values.unshift({ id: fallback.id, name: fallback.name });
    }
  }

  if (!values.some((status) => status.id === "NEW")) {
    values.unshift({ id: "NEW", name: "New" });
  }

  return values;
}

async function resolveStatusLabel(
  adminId: mongoose.Types.ObjectId,
  statusId: string,
): Promise<{ id: string; name: string }> {
  const fallback = DEFAULT_STATUSES.find((status) => status.id === statusId);
  if (fallback) {
    return { id: fallback.id, name: fallback.name };
  }

  if (mongoose.Types.ObjectId.isValid(statusId)) {
    const status = await Status.findOne({
      _id: new mongoose.Types.ObjectId(statusId),
      adminId,
    })
      .select({ name: 1 })
      .lean();

    if (status) {
      return { id: statusId, name: status.name };
    }
  }

  return { id: statusId, name: statusId };
}

type LeadDoc = {
  _id: mongoose.Types.ObjectId;
  leadId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  source?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  statusChangedAt?: Date | null;
};

type ReceiptDoc = {
  externalId: string;
  leadId: mongoose.Types.ObjectId;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
};

async function formatPartnerLead(
  lead: LeadDoc,
  receipt: ReceiptDoc,
  adminObjectId: mongoose.Types.ObjectId,
): Promise<TaboolaPartnerLead> {
  const status = await resolveStatusLabel(adminObjectId, lead.status);

  return {
    id: lead._id.toString(),
    leadId: lead.leadId ?? null,
    clickId: receipt.externalId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone ?? "",
    country: lead.country ?? "",
    source: lead.source ?? "",
    status,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    statusChangedAt: lead.statusChangedAt
      ? new Date(lead.statusChangedAt).toISOString()
      : null,
  };
}

export async function listTaboolaPartnerLeads(options: {
  adminId: string;
  page?: number;
  limit?: number;
  updatedAfter?: string | null;
}): Promise<{
  leads: TaboolaPartnerLead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const adminObjectId = new mongoose.Types.ObjectId(options.adminId);
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const skip = (page - 1) * limit;

  let updatedAfterDate: Date | null = null;
  if (options.updatedAfter) {
    const parsed = new Date(options.updatedAfter);
    if (!Number.isNaN(parsed.getTime())) {
      updatedAfterDate = parsed;
    }
  }

  const matchStages: mongoose.PipelineStage[] = [
    {
      $match: {
        provider: "taboola",
        adminId: adminObjectId,
      },
    },
    {
      $lookup: {
        from: "leads",
        localField: "leadId",
        foreignField: "_id",
        as: "lead",
      },
    },
    { $unwind: "$lead" },
    {
      $match: {
        "lead.adminId": adminObjectId,
      },
    },
    {
      $addFields: {
        activityAt: {
          $ifNull: ["$lead.statusChangedAt", "$lead.createdAt"],
        },
      },
    },
  ];

  if (updatedAfterDate) {
    matchStages.push({
      $match: {
        activityAt: { $gte: updatedAfterDate },
      },
    });
  }

  const dataPipeline: mongoose.PipelineStage[] = [
    ...matchStages,
    { $sort: { activityAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const [rows, countRows] = await Promise.all([
    IntegrationLeadReceipt.aggregate(dataPipeline),
    IntegrationLeadReceipt.aggregate([
      ...matchStages,
      { $count: "total" },
    ]),
  ]);

  const total = (countRows[0] as { total?: number } | undefined)?.total ?? 0;

  const formatted: TaboolaPartnerLead[] = [];
  for (const row of rows) {
    const lead = row.lead as LeadDoc;
    const receipt: ReceiptDoc = {
      externalId: row.externalId as string,
      leadId: row.leadId as mongoose.Types.ObjectId,
      email: row.email as string | undefined,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    };
    formatted.push(await formatPartnerLead(lead, receipt, adminObjectId));
  }

  return {
    leads: formatted,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };
}

export async function getTaboolaPartnerLead(options: {
  adminId: string;
  identifier: string;
}): Promise<TaboolaPartnerLead | null> {
  const adminObjectId = new mongoose.Types.ObjectId(options.adminId);
  const identifier = options.identifier.trim();
  if (!identifier) return null;

  let receipt: ReceiptDoc | null = null;

  if (mongoose.Types.ObjectId.isValid(identifier)) {
    receipt = (await IntegrationLeadReceipt.findOne({
      provider: "taboola",
      adminId: adminObjectId,
      leadId: new mongoose.Types.ObjectId(identifier),
    }).lean()) as ReceiptDoc | null;
  }

  if (!receipt) {
    receipt = (await IntegrationLeadReceipt.findOne({
      provider: "taboola",
      adminId: adminObjectId,
      externalId: identifier,
    }).lean()) as ReceiptDoc | null;
  }

  let lead: LeadDoc | null = null;

  if (receipt) {
    lead = (await Lead.findOne({
      _id: receipt.leadId,
      adminId: adminObjectId,
    }).lean()) as LeadDoc | null;
  } else if (mongoose.Types.ObjectId.isValid(identifier)) {
    lead = (await Lead.findOne({
      _id: new mongoose.Types.ObjectId(identifier),
      adminId: adminObjectId,
    }).lean()) as LeadDoc | null;

    if (lead) {
      receipt = (await IntegrationLeadReceipt.findOne({
        provider: "taboola",
        adminId: adminObjectId,
        leadId: lead._id,
      }).lean()) as ReceiptDoc | null;
    }
  } else if (identifier) {
    lead = (await Lead.findOne({
      adminId: adminObjectId,
      leadId: identifier,
    }).lean()) as LeadDoc | null;

    if (lead) {
      receipt = (await IntegrationLeadReceipt.findOne({
        provider: "taboola",
        adminId: adminObjectId,
        leadId: lead._id,
      }).lean()) as ReceiptDoc | null;
    }
  }

  if (!lead || !receipt) return null;

  return formatPartnerLead(lead, receipt, adminObjectId);
}

import { Lead, LeadSource } from "@/types/leads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

export const ASSIGNED_LEADS_QUERY_STALE_MS = 5 * 60 * 1000;

interface AssignedToUser {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
}

interface LeadFromAPI {
  _id: string;
  leadId?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  country?: string;
  value?: number;
  source: string;
  status: string;
  comments?: string;
  lastComment?: string;
  lastCommentDate?: string;
  lastActivityAt?: string;
  commentCount?: number;
  assignedAt?: string;
  assignedTo: AssignedToUser | string | null;
  statusChangedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AssignedLeadsResponse {
  assignedLeads?: LeadFromAPI[];
  count?: number;
}

export const assignedLeadsKeys = {
  all: ["assignedLeads"] as const,
  lists: () => [...assignedLeadsKeys.all, "list"] as const,
  list: (userId: string) => [...assignedLeadsKeys.lists(), userId] as const,
  details: () => [...assignedLeadsKeys.all, "detail"] as const,
  detail: (id: string) => [...assignedLeadsKeys.details(), id] as const,
};

const normalizeAssignedTo = (
  assignedTo: AssignedToUser | string | null,
): { id: string; firstName: string; lastName: string } | null => {
  if (!assignedTo) return null;

  if (typeof assignedTo === "string") {
    return null;
  }

  if (typeof assignedTo === "object") {
    return {
      id: assignedTo._id || assignedTo.id || "",
      firstName: assignedTo.firstName,
      lastName: assignedTo.lastName,
    };
  }

  return null;
};

const normalizeSource = (source: string): LeadSource | string => {
  if (
    !source ||
    source.trim() === "" ||
    source.trim() === "null" ||
    source.trim() === "undefined"
  ) {
    return "—";
  }

  if (source.trim() === "-" || source.trim() === "—") {
    return "—";
  }

  const cleanSource = source.trim();

  const standardSources: Record<string, LeadSource> = {
    WEBSITE: "WEBSITE",
    WEB: "WEBSITE",
    REFERRAL: "REFERRAL",
    SOCIAL: "SOCIAL",
    EMAIL: "EMAIL",
    OTHER: "OTHER",
  };

  const upperSource = cleanSource.toUpperCase();

  if (standardSources[upperSource]) {
    return standardSources[upperSource];
  }

  return cleanSource;
};

export async function fetchAssignedLeads(): Promise<Lead[]> {
  const res = await apiCallWithSessionRefresh("/api/leads/assigned", {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Unauthorized"
        : `Failed to fetch assigned leads (${res.status})`,
    );
  }

  const data = (await res.json()) as AssignedLeadsResponse | LeadFromAPI[];
  const leadRows: LeadFromAPI[] = Array.isArray(data)
    ? data
    : Array.isArray(data.assignedLeads)
      ? data.assignedLeads
      : [];

  return leadRows.map(
    (lead: LeadFromAPI): Lead => ({
      _id: lead._id,
      id: lead._id,
      leadId: lead.leadId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      phone: lead.phone,
      country: lead.country,
      value: lead.value,
      source: normalizeSource(lead.source) as LeadSource,
      status: lead.status,
      comments: undefined,
      lastComment: lead.lastComment,
      lastCommentDate: lead.lastCommentDate,
      lastActivityAt: lead.lastActivityAt,
      commentCount: lead.commentCount,
      assignedTo: normalizeAssignedTo(lead.assignedTo),
      assignedAt: lead.assignedAt,
      statusChangedAt: lead.statusChangedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }),
  );
}

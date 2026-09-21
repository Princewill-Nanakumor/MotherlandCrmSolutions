import { Lead, LeadSource } from "@/types/leads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { parseLeadPageSize } from "@/lib/leadPageSize";

export const ASSIGNED_LEADS_QUERY_STALE_MS = 2 * 60 * 1000;
export const ASSIGNED_LEADS_QUERY_TIMEOUT_MS = 90_000;

type FilterMode = "include" | "exclude";

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

export type AssignedLeadsListResponse = {
  leads: Lead[];
  total: number;
  totalAll: number;
};

export type AssignedLeadsQueryFilters = {
  page: number;
  pageSize: number;
  filterByCountry: string[];
  filterByStatus: string[];
  filterBySource: string[];
  countryFilterMode: FilterMode;
  statusFilterMode: FilterMode;
  sourceFilterMode: FilterMode;
  searchQuery: string;
};

export const assignedLeadsKeys = {
  all: ["assignedLeads"] as const,
  lists: () => [...assignedLeadsKeys.all, "list"] as const,
  list: (userId: string) => [...assignedLeadsKeys.lists(), userId] as const,
  details: () => [...assignedLeadsKeys.all, "detail"] as const,
  detail: (id: string) => [...assignedLeadsKeys.details(), id] as const,
};

export function buildAssignedLeadsQueryKey(
  userId: string,
  filters: AssignedLeadsQueryFilters,
) {
  return [
    ...assignedLeadsKeys.list(userId),
    filters.page,
    filters.pageSize,
    filters.filterByCountry,
    filters.filterByStatus,
    filters.filterBySource,
    filters.countryFilterMode,
    filters.statusFilterMode,
    filters.sourceFilterMode,
    filters.searchQuery,
  ] as const;
}

function parseFilterArray(param: string | null): string[] {
  if (!param || param === "all") return [];
  try {
    const parsed = JSON.parse(param);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* legacy */
  }
  if (param.includes(",")) {
    return param.split(",").map((v) => v.trim()).filter(Boolean);
  }
  return [param];
}

function parseFilterMode(param: string | null): FilterMode {
  return param === "exclude" ? "exclude" : "include";
}

export function resolveAssignedLeadsQueryFilters(
  searchParams: URLSearchParams,
  searchQuery: string,
): AssignedLeadsQueryFilters {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = parseLeadPageSize(searchParams.get("pageSize"));
  return {
    page,
    pageSize,
    filterByCountry: parseFilterArray(searchParams.get("country")),
    filterByStatus: parseFilterArray(searchParams.get("status")),
    filterBySource: parseFilterArray(searchParams.get("source")),
    countryFilterMode: parseFilterMode(searchParams.get("countryMode")),
    statusFilterMode: parseFilterMode(searchParams.get("statusMode")),
    sourceFilterMode: parseFilterMode(searchParams.get("sourceMode")),
    searchQuery,
  };
}

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

function mapAssignedLead(lead: LeadFromAPI): Lead {
  return {
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
  };
}

export async function fetchAssignedLeadsPage(
  filters: AssignedLeadsQueryFilters,
): Promise<AssignedLeadsListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.filterByCountry.length > 0) {
    params.set("country", JSON.stringify(filters.filterByCountry));
  }
  if (filters.filterByStatus.length > 0) {
    params.set("status", JSON.stringify(filters.filterByStatus));
  }
  if (filters.filterBySource.length > 0) {
    params.set("source", JSON.stringify(filters.filterBySource));
  }
  params.set("countryMode", filters.countryFilterMode);
  params.set("statusMode", filters.statusFilterMode);
  params.set("sourceMode", filters.sourceFilterMode);

  const searchTrimmed = (filters.searchQuery ?? "").trim();
  if (searchTrimmed) {
    params.set("search", searchTrimmed);
  }

  let url = `/api/leads/assigned?${params.toString()}`;
  if (searchTrimmed && url.includes("search=")) {
    url = url.replace(
      /search=[^&]*/,
      "search=" + encodeURIComponent(searchTrimmed),
    );
  }

  const res = await apiCallWithSessionRefresh(url, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    timeoutMs: ASSIGNED_LEADS_QUERY_TIMEOUT_MS,
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Unauthorized"
        : `Failed to fetch assigned leads (${res.status})`,
    );
  }

  const data = (await res.json()) as {
    leads?: LeadFromAPI[];
    assignedLeads?: LeadFromAPI[];
    total?: number;
    totalAll?: number;
    count?: number;
  } | LeadFromAPI[];

  const leadRows: LeadFromAPI[] = Array.isArray(data)
    ? data
    : Array.isArray(data.leads)
      ? data.leads
      : Array.isArray(data.assignedLeads)
        ? data.assignedLeads
        : [];

  const leads = leadRows.map(mapAssignedLead);
  if (Array.isArray(data)) {
    return { leads, total: leads.length, totalAll: leads.length };
  }
  return {
    leads,
    total: typeof data.total === "number" ? data.total : data.count ?? leads.length,
    totalAll:
      typeof data.totalAll === "number"
        ? data.totalAll
        : typeof data.total === "number"
          ? data.total
          : leads.length,
  };
}

/** Full assigned list for callers that still need every row (capped at max page). */
export async function fetchAssignedLeads(): Promise<Lead[]> {
  const page = await fetchAssignedLeadsPage({
    page: 1,
    pageSize: 500,
    filterByCountry: [],
    filterByStatus: [],
    filterBySource: [],
    countryFilterMode: "include",
    statusFilterMode: "include",
    sourceFilterMode: "include",
    searchQuery: "",
  });
  return page.leads;
}

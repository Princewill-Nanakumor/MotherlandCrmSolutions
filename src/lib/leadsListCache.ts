import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Lead } from "@/types/leads";
import { normalizeLeadStatusId } from "@/lib/leadClientUpdate";

type TimestampPatch = {
  statusChangedAt?: string;
  lastActivityAt?: string;
  updatedAt?: string;
};

function isLeadsListRoot(key: QueryKey): boolean {
  return (
    Array.isArray(key) &&
    (key[0] === "leads" || key[0] === "assignedLeads")
  );
}

/**
 * Paginated all-leads keys from `useLeadsPage`:
 * ["leads", page, pageSize, user, country[], status[], source[],
 *  countryMode, statusMode, sourceMode, userMode, search]
 */
function getStatusFilterFromQueryKey(key: QueryKey): {
  ids: string[];
  mode: "include" | "exclude";
} | null {
  if (!Array.isArray(key) || key[0] !== "leads" || key.length < 9) return null;
  const raw = key[5];
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return {
    ids: raw.map((value) => normalizeLeadStatusId(value)),
    mode: key[8] === "exclude" ? "exclude" : "include",
  };
}

function matchesStatusFilter(
  statusId: string,
  filter: { ids: string[]; mode: "include" | "exclude" },
): boolean {
  const hit = filter.ids.includes(statusId);
  return filter.mode === "exclude" ? !hit : hit;
}

function patchListDataForStatusChange(
  old: unknown,
  queryKey: QueryKey,
  leadId: string,
  newStatus: string,
  timestamps: TimestampPatch,
): unknown {
  const statusId = normalizeLeadStatusId(newStatus);
  const filter = getStatusFilterFromQueryKey(queryKey);
  const shouldKeep = !filter || matchesStatusFilter(statusId, filter);

  const applyLead = (lead: Lead): Lead | null => {
    if (lead._id !== leadId) return lead;
    if (!shouldKeep) return null;
    return {
      ...lead,
      status: statusId,
      ...timestamps,
    };
  };

  if (Array.isArray(old)) {
    const next: Lead[] = [];
    for (const lead of old as Lead[]) {
      const updated = applyLead(lead);
      if (updated) next.push(updated);
    }
    return next;
  }

  if (old && typeof old === "object") {
    const withLeads = old as {
      leads?: Lead[];
      data?: Lead[];
      total?: number;
      totalAll?: number;
      [key: string]: unknown;
    };

    if (Array.isArray(withLeads.leads)) {
      let removed = 0;
      const nextLeads: Lead[] = [];
      for (const lead of withLeads.leads) {
        const updated = applyLead(lead);
        if (updated === null) {
          removed += 1;
          continue;
        }
        nextLeads.push(updated);
      }
      return {
        ...withLeads,
        leads: nextLeads,
        total:
          typeof withLeads.total === "number"
            ? Math.max(0, withLeads.total - removed)
            : withLeads.total,
      };
    }

    if (Array.isArray(withLeads.data)) {
      let removed = 0;
      const nextData: Lead[] = [];
      for (const lead of withLeads.data) {
        const updated = applyLead(lead);
        if (updated === null) {
          removed += 1;
          continue;
        }
        nextData.push(updated);
      }
      return {
        ...withLeads,
        data: nextData,
        total:
          typeof withLeads.total === "number"
            ? Math.max(0, withLeads.total - removed)
            : withLeads.total,
      };
    }
  }

  return old;
}

/**
 * Apply a remote (or local) status change across every leads list cache.
 * Removes the row from status-filtered all-leads pages that no longer match.
 */
export function applyRemoteLeadStatusToListCaches(
  queryClient: QueryClient,
  leadId: string,
  newStatus: string,
  options?: { touchActivity?: boolean },
): void {
  if (!leadId) return;
  const statusId = normalizeLeadStatusId(newStatus);
  if (!statusId) return;

  const now = new Date().toISOString();
  const timestamps: TimestampPatch = {
    statusChangedAt: now,
    updatedAt: now,
    ...(options?.touchActivity ? { lastActivityAt: now } : {}),
  };

  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => isLeadsListRoot(query.queryKey),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (old: unknown) =>
      patchListDataForStatusChange(
        old,
        query.queryKey,
        leadId,
        statusId,
        timestamps,
      ),
    );
  }
}

function patchListDataForDeletedStatus(
  old: unknown,
  deletedStatusKeys: Set<string>,
  replacementStatus: string,
  timestamps: TimestampPatch,
): unknown {
  const applyLead = (lead: Lead): Lead => {
    const current = normalizeLeadStatusId(lead.status);
    if (!deletedStatusKeys.has(current)) return lead;
    return {
      ...lead,
      status: replacementStatus,
      ...timestamps,
    };
  };

  if (Array.isArray(old)) {
    return (old as Lead[]).map(applyLead);
  }

  if (old && typeof old === "object") {
    const withLeads = old as {
      leads?: Lead[];
      data?: Lead[];
      [key: string]: unknown;
    };
    if (Array.isArray(withLeads.leads)) {
      return { ...withLeads, leads: withLeads.leads.map(applyLead) };
    }
    if (Array.isArray(withLeads.data)) {
      return { ...withLeads, data: withLeads.data.map(applyLead) };
    }
  }

  return old;
}

/**
 * After a custom status is deleted, rewrite every cached lead that still
 * points at that status id/name to the default replacement (usually "NEW").
 */
export function reassignDeletedStatusInListCaches(
  queryClient: QueryClient,
  deletedStatusKeys: string[],
  replacementStatus = "NEW",
): void {
  const keys = new Set(
    deletedStatusKeys.map((k) => normalizeLeadStatusId(k)).filter(Boolean),
  );
  if (keys.size === 0) return;

  const now = new Date().toISOString();
  const timestamps: TimestampPatch = {
    statusChangedAt: now,
    updatedAt: now,
  };

  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => isLeadsListRoot(query.queryKey),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (old: unknown) =>
      patchListDataForDeletedStatus(
        old,
        keys,
        replacementStatus,
        timestamps,
      ),
    );
  }
}

function uniqueLeadIds(leadIds: string[]): string[] {
  return leadIds.filter(
    (id, index, arr) => Boolean(id) && arr.indexOf(id) === index,
  );
}

function patchPaginatedLeadsAssignmentClear(
  old: unknown,
  leadIds: Set<string>,
): unknown {
  const clearLead = (lead: Lead): Lead =>
    leadIds.has(lead._id) ? { ...lead, assignedTo: null } : lead;

  if (old && typeof old === "object") {
    const withLeads = old as {
      leads?: Lead[];
      data?: Lead[];
      [key: string]: unknown;
    };

    if (Array.isArray(withLeads.leads)) {
      return { ...withLeads, leads: withLeads.leads.map(clearLead) };
    }
    if (Array.isArray(withLeads.data)) {
      return { ...withLeads, data: withLeads.data.map(clearLead) };
    }
  }

  return old;
}

/**
 * Drop leads from every assigned-leads list cache (agent My Leads) and clear
 * assignment on matching rows in paginated all-leads caches.
 */
export function removeLeadsFromAssignedLeadsCaches(
  queryClient: QueryClient,
  leadIds: string[],
): void {
  const ids = new Set(uniqueLeadIds(leadIds));
  if (ids.size === 0) return;

  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => isLeadsListRoot(query.queryKey),
  });

  for (const query of queries) {
    const key = query.queryKey;
    if (!Array.isArray(key)) continue;

    if (key[0] === "assignedLeads" && key[1] === "list") {
      queryClient.setQueryData(key, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return (old as Lead[]).filter((lead) => !ids.has(lead._id));
      });
      continue;
    }

    if (key[0] === "leads") {
      queryClient.setQueryData(key, (old: unknown) =>
        patchPaginatedLeadsAssignmentClear(old, ids),
      );
    }
  }
}

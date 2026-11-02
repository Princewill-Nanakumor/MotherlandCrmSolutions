import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Lead } from "@/types/leads";
import { normalizeLeadStatusId } from "@/lib/leadClientUpdate";
import { transformLeadsListCacheData } from "@/lib/leadListSort";

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
 *  countryMode, statusMode, sourceMode, userMode, search, sortField, sortOrder]
 */
function getStatusFilterFromQueryKey(key: QueryKey): {
  ids: string[];
  mode: "include" | "exclude";
} | null {
  if (!Array.isArray(key)) return null;
  if (key[0] === "leads" && key.length >= 9) {
    const raw = key[5];
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return {
      ids: raw.map((value) => normalizeLeadStatusId(value)),
      mode: key[8] === "exclude" ? "exclude" : "include",
    };
  }
  // ["assignedLeads", "list", userId, page, pageSize, country[], status[], source[],
  //  countryMode, statusMode, sourceMode, search, sortField, sortOrder]
  if (key[0] === "assignedLeads" && key[1] === "list" && key.length >= 10) {
    const raw = key[6];
    if (!Array.isArray(raw) || raw.length === 0) return null;
    return {
      ids: raw.map((value) => normalizeLeadStatusId(value)),
      mode: key[9] === "exclude" ? "exclude" : "include",
    };
  }
  return null;
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
  let removed = 0;

  const next = transformLeadsListCacheData(
    old,
    Array.isArray(queryKey) ? queryKey : [],
    (rows) => {
      const nextRows: Lead[] = [];
      for (const lead of rows) {
        if (lead._id !== leadId) {
          nextRows.push(lead);
          continue;
        }
        if (!shouldKeep) {
          removed += 1;
          continue;
        }
        nextRows.push({
          ...lead,
          status: statusId,
          ...timestamps,
        });
      }
      return nextRows;
    },
  );

  if (
    removed > 0 &&
    next &&
    typeof next === "object" &&
    !Array.isArray(next) &&
    typeof (next as { total?: number }).total === "number"
  ) {
    const withTotal = next as { total: number; [key: string]: unknown };
    return {
      ...withTotal,
      total: Math.max(0, withTotal.total - removed),
    };
  }

  return next;
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
  queryKey: QueryKey,
  deletedStatusKeys: Set<string>,
  replacementStatus: string,
  timestamps: TimestampPatch,
): unknown {
  return transformLeadsListCacheData(
    old,
    Array.isArray(queryKey) ? queryKey : [],
    (rows) =>
      rows.map((lead) => {
        const current = normalizeLeadStatusId(lead.status);
        if (!deletedStatusKeys.has(current)) return lead;
        return {
          ...lead,
          status: replacementStatus,
          ...timestamps,
        };
      }),
  );
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
        query.queryKey,
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

/**
 * Update list rows when a softphone call is initiated from the lead panel.
 */
export function patchLeadLastCallInitiatedInListCaches(
  queryClient: QueryClient,
  leadId: string,
  lastCallInitiatedAt: string,
): void {
  if (!leadId || !lastCallInitiatedAt) return;

  const queries = queryClient.getQueryCache().findAll({
    predicate: (query) => isLeadsListRoot(query.queryKey),
  });

  for (const query of queries) {
    queryClient.setQueryData(query.queryKey, (old: unknown) =>
      transformLeadsListCacheData(
        old,
        Array.isArray(query.queryKey) ? query.queryKey : [],
        (rows) =>
          rows.map((lead) =>
            lead._id === leadId
              ? {
                  ...lead,
                  lastCallInitiatedAt,
                  lastActivityAt: lastCallInitiatedAt,
                  updatedAt: lastCallInitiatedAt,
                }
              : lead,
          ),
      ),
    );
  }
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
        let removed = 0;
        const next = transformLeadsListCacheData(old, key, (rows) => {
          const kept = rows.filter((lead) => !ids.has(lead._id));
          removed = rows.length - kept.length;
          return kept;
        });
        if (
          removed > 0 &&
          next &&
          typeof next === "object" &&
          !Array.isArray(next)
        ) {
          const withTotals = next as {
            total?: number;
            totalAll?: number;
            [key: string]: unknown;
          };
          return {
            ...withTotals,
            total:
              typeof withTotals.total === "number"
                ? Math.max(0, withTotals.total - removed)
                : withTotals.total,
            totalAll:
              typeof withTotals.totalAll === "number"
                ? Math.max(0, withTotals.totalAll - removed)
                : withTotals.totalAll,
          };
        }
        return next;
      });
      continue;
    }

    if (key[0] === "leads") {
      queryClient.setQueryData(key, (old: unknown) =>
        transformLeadsListCacheData(old, key, (rows) =>
          rows.map((lead) =>
            ids.has(lead._id) ? { ...lead, assignedTo: null } : lead,
          ),
        ),
      );
    }
  }
}

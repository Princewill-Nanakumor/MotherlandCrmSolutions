// src/hooks/useLeadsURLManagement.ts
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";
import { normalizeLeadId } from "@/lib/leadId";

type SortField = "leadId" | "name" | "country" | "status" | "source" | "lastActivityAt" | "assignedTo" | "createdAt" | "statusChangedAt" | "lastComment" | "lastCommentDate" | "commentCount";
type SortOrder = "asc" | "desc";
type FilterMode = "include" | "exclude";

export const useLeadsURLManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Helper to create a mutable URLSearchParams instance that:
   * - Uses the live `window.location.search` in the browser (so we always work
   *   with the latest query string, just like the all-leads table does), and
   * - Falls back to Next's `useSearchParams` snapshot when `window` is not available.
   */
  const createParams = useCallback(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(searchParams ?? undefined);
  }, [searchParams]);

  // Keep query order visually aligned with /dashboard/all-leads.
  const normalizeQueryOrder = useCallback((params: URLSearchParams) => {
    const ordered = new URLSearchParams();
    const preferredOrder = [
      "page",
      "user",
      "countryMode",
      "statusMode",
      "sourceMode",
      "country",
      "status",
      "source",
      "lead",
      "name",
      "sortField",
      "sortOrder",
      "pageSize",
      "search",
    ] as const;

    for (const key of preferredOrder) {
      const value = params.get(key);
      if (value !== null) ordered.set(key, value);
    }

    for (const [key, value] of params.entries()) {
      if (!ordered.has(key)) ordered.set(key, value);
    }

    return ordered;
  }, []);

  /**
   * Helper to push an updated URL, mirroring the behavior used on
   * `/dashboard/all-leads`:
   * - Keep the current pathname (no route change),
   * - Only adjust the query string.
   */
  const pushWithParams = useCallback(
    (params: URLSearchParams) => {
      const orderedParams = normalizeQueryOrder(params);
      const query = orderedParams.toString();
      if (typeof window !== "undefined") {
        const basePath = window.location.pathname;
        const url = query ? `${basePath}?${query}` : basePath;
        window.history.replaceState(null, "", url);
      } else {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      }
    },
    [normalizeQueryOrder, router],
  );

  const ensureDefaultFilterModes = useCallback((params: URLSearchParams) => {
    if (!params.has("countryMode")) params.set("countryMode", "include");
    if (!params.has("statusMode")) params.set("statusMode", "include");
    if (!params.has("sourceMode")) params.set("sourceMode", "include");
  }, []);

  const handleSort = useCallback(
    (field: SortField, currentField: SortField, currentOrder: SortOrder) => {
      const newOrder: SortOrder =
        currentField === field && currentOrder === "asc" ? "desc" : "asc";
      const params = createParams();
      params.set("sortField", field);
      params.set("sortOrder", newOrder);
      pushWithParams(params);
      return { newField: field, newOrder };
    },
    [createParams, pushWithParams]
  );

  const handleLeadClick = useCallback(
    (lead: Lead) => {
      const params = createParams();
      // Use leadId if available, otherwise fall back to _id
      const idToUse = normalizeLeadId(lead.leadId) || lead._id;
      params.set("lead", idToUse);
      params.set("name", `${lead.firstName}-${lead.lastName}`);
      pushWithParams(params);
    },
    [createParams, pushWithParams]
  );

  const handlePanelClose = useCallback(() => {
    const params = createParams();
    params.delete("lead");
    params.delete("name");
    pushWithParams(params);
  }, [createParams, pushWithParams]);

  const handleCountryFilterChange = useCallback(
    (country: string) => {
      const params = createParams();
      params.set("page", "1");
      ensureDefaultFilterModes(params);
      if (country === "all") {
        params.delete("country");
      } else {
        params.set("country", country);
      }
      pushWithParams(params);
    },
    [createParams, ensureDefaultFilterModes, pushWithParams]
  );

  // Add status filter change handler
  const handleStatusFilterChange = useCallback(
    (status: string) => {
      const params = createParams();
      params.set("page", "1");
      ensureDefaultFilterModes(params);
      if (status === "all") {
        params.delete("status");
      } else {
        params.set("status", status);
      }
      pushWithParams(params);
    },
    [createParams, ensureDefaultFilterModes, pushWithParams]
  );

  // Add source filter change handler
  const handleSourceFilterChange = useCallback(
    (source: string) => {
      const params = createParams();
      params.set("page", "1");
      ensureDefaultFilterModes(params);
      if (source === "all") {
        params.delete("source");
      } else {
        params.set("source", source);
      }
      pushWithParams(params);
    },
    [createParams, ensureDefaultFilterModes, pushWithParams]
  );

  const handleCountryFilterModeChange = useCallback(
    (mode: FilterMode) => {
      const params = createParams();
      params.set("page", "1");
      params.set("countryMode", mode);
      ensureDefaultFilterModes(params);
      pushWithParams(params);
    },
    [createParams, ensureDefaultFilterModes, pushWithParams]
  );

  const handleStatusFilterModeChange = useCallback(
    (mode: FilterMode) => {
      const params = createParams();
      params.set("page", "1");
      params.set("statusMode", mode);
      ensureDefaultFilterModes(params);
      pushWithParams(params);
    },
    [createParams, ensureDefaultFilterModes, pushWithParams]
  );

  const handleSourceFilterModeChange = useCallback(
    (mode: FilterMode) => {
      const params = createParams();
      params.set("page", "1");
      params.set("sourceMode", mode);
      ensureDefaultFilterModes(params);
      pushWithParams(params);
    },
    [createParams, ensureDefaultFilterModes, pushWithParams]
  );

  const handleNavigation = useCallback(
    (direction: "prev" | "next", selectedLead: Lead, sortedLeads: Lead[]) => {
      if (!selectedLead) return;

      const index = sortedLeads.findIndex(
        (lead) => lead._id === selectedLead._id
      );
      const newIndex = direction === "prev" ? index - 1 : index + 1;

      if (newIndex >= 0 && newIndex < sortedLeads.length) {
        const newLead = sortedLeads[newIndex];
        const params = createParams();
        // Use leadId if available, otherwise fall back to _id
        const idToUse = normalizeLeadId(newLead.leadId) || newLead._id;
        params.set("lead", idToUse);
        params.set("name", `${newLead.firstName}-${newLead.lastName}`);
        pushWithParams(params);
      }
    },
    [createParams, pushWithParams]
  );

  return {
    handleSort,
    handleLeadClick,
    handlePanelClose,
    handleCountryFilterChange,
    handleStatusFilterChange,
    handleSourceFilterChange,
    handleCountryFilterModeChange,
    handleStatusFilterModeChange,
    handleSourceFilterModeChange,
    handleNavigation,
  };
};

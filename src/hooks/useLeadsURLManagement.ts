// src/hooks/useLeadsURLManagement.ts
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";

type SortField = "leadId" | "name" | "country" | "status" | "source" | "assignedTo" | "createdAt" | "lastComment" | "lastCommentDate" | "commentCount";
type SortOrder = "asc" | "desc";

export const useLeadsURLManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Helper to create a mutable URLSearchParams instance that:
   * - Uses the live `window.location.search` in the browser (so we always work
   *   with the latest query string, just like the all-leads table does), and
   * - Falls back to Next's `useSearchParams` snapshot when `window` is not available.
   */
  const createParams = () => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams(searchParams);
  };

  /**
   * Helper to push an updated URL, mirroring the behavior used on
   * `/dashboard/all-leads`:
   * - Keep the current pathname (no route change),
   * - Only adjust the query string.
   */
  const pushWithParams = (params: URLSearchParams) => {
    if (typeof window !== "undefined") {
      const basePath = window.location.pathname;
      const query = params.toString();
      const url = query ? `${basePath}?${query}` : basePath;
      router.push(url, { scroll: false });
    } else {
      const query = params.toString();
      router.push(query ? `?${query}` : "?", { scroll: false });
    }
  };

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
      const idToUse = lead.leadId ? lead.leadId.toString() : lead._id;
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
      if (country === "all") {
        params.delete("country");
      } else {
        params.set("country", country);
      }
      pushWithParams(params);
    },
    [createParams, pushWithParams]
  );

  // Add status filter change handler
  const handleStatusFilterChange = useCallback(
    (status: string) => {
      const params = createParams();
      if (status === "all") {
        params.delete("status");
      } else {
        params.set("status", status);
      }
      pushWithParams(params);
    },
    [createParams, pushWithParams]
  );

  // Add source filter change handler
  const handleSourceFilterChange = useCallback(
    (source: string) => {
      const params = createParams();
      if (source === "all") {
        params.delete("source");
      } else {
        params.set("source", source);
      }
      pushWithParams(params);
    },
    [createParams, pushWithParams]
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
        const idToUse = newLead.leadId ? newLead.leadId.toString() : newLead._id;
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
    handleNavigation,
  };
};

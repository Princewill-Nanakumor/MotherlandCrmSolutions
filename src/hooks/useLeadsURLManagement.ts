// src/hooks/useLeadsURLManagement.ts
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lead } from "@/types/leads";

type SortField = "leadId" | "name" | "country" | "status" | "source" | "assignedTo" | "createdAt" | "lastComment" | "lastCommentDate" | "commentCount";
type SortOrder = "asc" | "desc";

export const useLeadsURLManagement = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSort = useCallback(
    (field: SortField, currentField: SortField, currentOrder: SortOrder) => {
      const newOrder: SortOrder =
        currentField === field && currentOrder === "asc" ? "desc" : "asc";
      const params = new URLSearchParams(searchParams);
      params.set("sortField", field);
      params.set("sortOrder", newOrder);
      router.push(`?${params.toString()}`, { scroll: false });
      return { newField: field, newOrder };
    },
    [searchParams, router]
  );

  const handleLeadClick = useCallback(
    (lead: Lead) => {
      const params = new URLSearchParams(searchParams);
      // Use leadId if available, otherwise fall back to _id
      const idToUse = lead.leadId ? lead.leadId.toString() : lead._id;
      params.set("lead", idToUse);
      params.set("name", `${lead.firstName}-${lead.lastName}`);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const handlePanelClose = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("lead");
    params.delete("name");
    router.push(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleCountryFilterChange = useCallback(
    (country: string) => {
      const params = new URLSearchParams(searchParams);
      if (country === "all") {
        params.delete("country");
      } else {
        params.set("country", country);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Add status filter change handler
  const handleStatusFilterChange = useCallback(
    (status: string) => {
      const params = new URLSearchParams(searchParams);
      if (status === "all") {
        params.delete("status");
      } else {
        params.set("status", status);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Add source filter change handler
  const handleSourceFilterChange = useCallback(
    (source: string) => {
      const params = new URLSearchParams(searchParams);
      if (source === "all") {
        params.delete("source");
      } else {
        params.set("source", source);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
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
        const params = new URLSearchParams(searchParams);
        // Use leadId if available, otherwise fall back to _id
        const idToUse = newLead.leadId ? newLead.leadId.toString() : newLead._id;
        params.set("lead", idToUse);
        params.set("name", `${newLead.firstName}-${newLead.lastName}`);
        router.push(`?${params.toString()}`, { scroll: false });
      }
    },
    [searchParams, router]
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

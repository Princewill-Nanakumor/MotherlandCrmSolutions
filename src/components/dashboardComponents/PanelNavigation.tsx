// src/components/dashboardComponents/PanelNavigation.tsx
"use client";

import { useCallback } from "react";
import { Lead } from "@/types/leads";
import { useRouter, useSearchParams } from "next/navigation";

interface PanelNavigationProps {
  selectedLead: Lead | null;
  sortedLeads: Lead[];
  setSelectedLead: (lead: Lead | null) => void;
  setIsPanelOpen: (open: boolean) => void;
}

export const usePanelNavigation = ({
  selectedLead,
  sortedLeads,
  setSelectedLead,
  setIsPanelOpen,
}: PanelNavigationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Memoized URL update function
  const updateUrl = useCallback(
    (lead: Lead | null) => {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams ?? undefined);

      if (lead) {
        // Use leadId if available, otherwise fall back to _id
        const idToUse = lead.leadId ? lead.leadId.toString() : lead._id;
        params.set("lead", idToUse);
        params.set("name", `${lead.firstName || ""}-${lead.lastName || ""}`);
      } else {
        params.delete("lead");
        params.delete("name");
      }

      const query = params.toString();
      if (typeof window !== "undefined") {
        const newUrl = query
          ? `${window.location.pathname}?${query}`
          : window.location.pathname;
        window.history.replaceState(null, "", newUrl);
      } else {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      }
    },
    [router, searchParams]
  );

  // Stable event handlers
  const handleRowClick = useCallback(
    (lead: Lead) => {
      if (!lead?._id) {
        return;
      }

      setSelectedLead(lead);
      setIsPanelOpen(true);
      updateUrl(lead);
    },
    [setSelectedLead, setIsPanelOpen, updateUrl]
  );

  const handlePanelClose = useCallback(() => {
    setSelectedLead(null);
    setIsPanelOpen(false);
    updateUrl(null);
  }, [setSelectedLead, setIsPanelOpen, updateUrl]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedLead) return;

      const currentIndex = sortedLeads.findIndex(
        (lead) => lead._id === selectedLead._id
      );
      let newLead: Lead | null = null;

      if (direction === "prev" && currentIndex > 0) {
        newLead = sortedLeads[currentIndex - 1];
      } else if (
        direction === "next" &&
        currentIndex < sortedLeads.length - 1
      ) {
        newLead = sortedLeads[currentIndex + 1];
      }

      if (newLead) {
        setSelectedLead(newLead);
        updateUrl(newLead);
      }
    },
    [sortedLeads, selectedLead, setSelectedLead, updateUrl]
  );

  const currentIndex = selectedLead
    ? sortedLeads.findIndex((lead) => lead._id === selectedLead._id)
    : -1;

  return {
    handleRowClick,
    handlePanelClose,
    handleNavigate,
    currentIndex,
  };
};

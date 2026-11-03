// src/components/dashboardComponents/PanelNavigation.tsx
"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types/leads";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCloseLeadPanel,
  useOpenLeadPanel,
} from "@/stores/leadsStore";
import { prefetchLeadPanelTimeline } from "@/lib/leadPanelTimelinePrefetch";

interface PanelNavigationProps {
  selectedLead: Lead | null;
  sortedLeads: Lead[];
}

function scheduleUrlUpdate(update: () => void) {
  // Keep the click handler free of history work so the row/panel can paint first.
  if (typeof window === "undefined") {
    update();
    return;
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(update);
  });
}

export const usePanelNavigation = ({
  selectedLead,
  sortedLeads,
}: PanelNavigationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const openLeadPanel = useOpenLeadPanel();
  const closeLeadPanel = useCloseLeadPanel();

  const updateUrl = useCallback(
    (lead: Lead | null) => {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams(searchParams ?? undefined);

      if (lead) {
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
    [router, searchParams],
  );

  const handleRowClick = useCallback(
    (lead: Lead) => {
      if (!lead?._id) return;

      // Kick off timeline fetches before the panel chunk mounts.
      prefetchLeadPanelTimeline(queryClient, lead._id);
      // One store write → one subscriber pass for selection + panel open.
      openLeadPanel(lead);
      scheduleUrlUpdate(() => updateUrl(lead));
    },
    [openLeadPanel, queryClient, updateUrl],
  );

  const handlePanelClose = useCallback(() => {
    closeLeadPanel();
    scheduleUrlUpdate(() => updateUrl(null));
  }, [closeLeadPanel, updateUrl]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedLead) return;

      const currentIndex = sortedLeads.findIndex(
        (lead) => lead._id === selectedLead._id,
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
        prefetchLeadPanelTimeline(queryClient, newLead._id);
        openLeadPanel(newLead);
        scheduleUrlUpdate(() => updateUrl(newLead));
      }
    },
    [sortedLeads, selectedLead, openLeadPanel, queryClient, updateUrl],
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

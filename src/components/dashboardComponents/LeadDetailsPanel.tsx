"use client";

import React, { FC, useState, useCallback, useRef, useEffect } from "react";
import { Lead } from "@/types/leads";
import { LeadHeader } from "../leads/leadDetailsPanel/LeadHeader";
import { ContactSection } from "../leads/leadDetailsPanel/ContactSection";
import { DetailsSection } from "../leads/leadDetailsPanel/DetailsSection";
import LeadStatus from "../leads/leadDetailsPanel/LeadStatus";
import CommentsAndActivities from "../leads/leadDetailsPanel/CommentsAndActivities";
import AdsImageSlider from "../ads/AdsImageSlider";
import { useQueryClient } from "@tanstack/react-query";

interface LeadDetailsPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => Promise<boolean>;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const LeadDetailsPanel: FC<LeadDetailsPanelProps> = ({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onNavigate,
  hasPrevious,
  hasNext,
}) => {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    details: true,
    contact: true,
    ads: true,
  });

  const queryClient = useQueryClient();
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);
  const previousStatusRef = useRef<string | undefined>(undefined);
  const previousLeadRef = useRef<Lead | null>(null);
  const originalTitleRef = useRef<string>("");
  const lastManualUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (lead) {
      previousStatusRef.current = lead.status;
      previousLeadRef.current = lead;
      setCurrentLead(lead);
    }
  }, [lead]);

  useEffect(() => {
    if (!lead?._id) return;

    let debounceTimeout: NodeJS.Timeout;

    const checkAndUpdateLead = () => {
      const leadsData = queryClient.getQueryData(["leads"]);
      if (!leadsData) {
        console.log("🔍 LeadDetailsPanel: No leads data in cache");
        return;
      }

      let updatedLead: Lead | undefined;

      if (Array.isArray(leadsData)) {
        updatedLead = leadsData.find((l) => l._id === lead._id);
      } else if (leadsData && typeof leadsData === "object") {
        if ("data" in leadsData && Array.isArray(leadsData.data)) {
          updatedLead = leadsData.data.find((l) => l._id === lead._id);
        } else if ("leads" in leadsData && Array.isArray(leadsData.leads)) {
          updatedLead = leadsData.leads.find((l) => l._id === lead._id);
        }
      }

      // Only update if we have fresh data AND it's different from current state
      // AND the updatedAt timestamp is newer (indicating a server update)
      // AND we haven't had a manual update in the last 500ms (to prevent overriding optimistic updates)
      const timeSinceLastManualUpdate =
        Date.now() - lastManualUpdateRef.current;
      if (
        updatedLead &&
        updatedLead.status !== currentLead?.status &&
        updatedLead.updatedAt !== currentLead?.updatedAt &&
        (!currentLead?.updatedAt ||
          new Date(updatedLead.updatedAt) > new Date(currentLead.updatedAt)) &&
        timeSinceLastManualUpdate > 500
      ) {
        previousStatusRef.current = updatedLead.status;
        setCurrentLead(updatedLead);
      }
    };

    const debouncedCheckAndUpdateLead = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(checkAndUpdateLead, 100); // 100ms debounce
    };

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.queryKey[0] === "leads") {
        debouncedCheckAndUpdateLead();
      }
    });

    checkAndUpdateLead();

    return () => {
      clearTimeout(debounceTimeout);
      unsubscribe();
    };
  }, [lead?._id, queryClient, currentLead?.status, currentLead?.updatedAt]);

  const onLeadUpdatedRef = useRef(onLeadUpdated);
  onLeadUpdatedRef.current = onLeadUpdated;

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleLeadUpdated = useCallback(async (updatedLead: Lead) => {
    try {
      previousStatusRef.current = updatedLead.status;
      lastManualUpdateRef.current = Date.now();
      setCurrentLead(updatedLead);

      const result = await onLeadUpdatedRef.current(updatedLead);
      return result;
    } catch (error) {
      console.error("Error in handleLeadUpdated:", error);

      if (previousLeadRef.current) {
        setCurrentLead(previousLeadRef.current);
        previousStatusRef.current = previousLeadRef.current.status;
      }

      return false;
    }
  }, []);

  useEffect(() => {
    if (lead?._id && isOpen) {
      const checkCache = () => {
        const leadsData = queryClient.getQueryData(["leads"]);
        if (leadsData) {
          let freshLead: Lead | undefined;

          if (Array.isArray(leadsData)) {
            freshLead = leadsData.find((l) => l._id === lead._id);
          } else if (leadsData && typeof leadsData === "object") {
            if ("data" in leadsData && Array.isArray(leadsData.data)) {
              freshLead = leadsData.data.find((l) => l._id === lead._id);
            } else if ("leads" in leadsData && Array.isArray(leadsData.leads)) {
              freshLead = leadsData.leads.find((l) => l._id === lead._id);
            }
          }

          // Only update if we have a fresh lead and it's different from current, but avoid rapid updates
          const timeSinceLastManualUpdate =
            Date.now() - lastManualUpdateRef.current;
          if (
            freshLead &&
            freshLead.status !== currentLead?.status &&
            freshLead.updatedAt !== currentLead?.updatedAt &&
            (!currentLead?.updatedAt ||
              new Date(freshLead.updatedAt) >
                new Date(currentLead.updatedAt)) &&
            timeSinceLastManualUpdate > 500
          ) {
            setCurrentLead(freshLead);
          }
        }
      };

      // Only check once on mount, don't set up continuous checking
      checkCache();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?._id, isOpen, queryClient]);

  // Handle ESC key to close panel
  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);

    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  // Update browser title when panel is open and lead changes
  useEffect(() => {
    if (isOpen && currentLead) {
      // Store original title on first open (only once)
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title;
      }

      // Update title with lead name in format "[Name] - Motherland CRM"
      const fullName =
        `${currentLead.firstName || ""} ${currentLead.lastName || ""}`.trim();
      const leadTitle = fullName || "Lead Details";
      const newTitle = `${leadTitle} - Motherland CRM`;

      // Set title immediately
      document.title = newTitle;

      // Re-apply multiple times to ensure it persists over layout updates
      const timeout1 = setTimeout(() => {
        document.title = newTitle;
      }, 10);

      const timeout2 = setTimeout(() => {
        document.title = newTitle;
      }, 50);

      const timeout3 = setTimeout(() => {
        document.title = newTitle;
      }, 100);

      return () => {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        clearTimeout(timeout3);
      };
    } else if (!isOpen && originalTitleRef.current) {
      // Restore original title when panel closes
      document.title = originalTitleRef.current;
      originalTitleRef.current = "";
    }
  }, [isOpen, currentLead]);

  // Continuous title update while panel is open (prevents layout from overwriting)
  useEffect(() => {
    if (!isOpen || !currentLead) return;

    const fullName =
      `${currentLead.firstName || ""} ${currentLead.lastName || ""}`.trim();
    const leadTitle = fullName || "Lead Details";
    const newTitle = `${leadTitle} - Motherland CRM`;

    // Set up an interval to continuously ensure the title stays correct
    const intervalId = setInterval(() => {
      if (document.title !== newTitle) {
        document.title = newTitle;
      }
    }, 200); // Check every 200ms

    return () => clearInterval(intervalId);
  }, [isOpen, currentLead]);

  // Ensure original title is restored when the panel component unmounts
  useEffect(() => {
    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
        originalTitleRef.current = "";
      }
    };
  }, []);

  if (!currentLead?._id || !isOpen) {
    return null;
  }

  return (
    <div
      className="fixed right-0 z-50 flex bg-white border-l-2 dark:bg-gray-800"
      style={{
        width: "80vw",
        maxWidth: "1200px",
        top: "80px",
        bottom: "80px",
        height: "calc(100vh - 160px)",
      }}
    >
      <div className="flex flex-col w-2/5 border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
        <LeadHeader
          lead={currentLead}
          onClose={onClose}
          onNavigate={onNavigate}
          hasPrevious={hasPrevious}
          hasNext={hasNext}
        />
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <LeadStatus lead={currentLead} onLeadUpdated={handleLeadUpdated} />
          <ContactSection
            lead={currentLead}
            isExpanded={expandedSections.contact}
            onToggle={() => toggleSection("contact")}
            onLeadUpdated={handleLeadUpdated}
          />
          <AdsImageSlider
            isExpanded={expandedSections.ads}
            onToggle={() => toggleSection("ads")}
          />
          <DetailsSection
            lead={currentLead}
            isExpanded={expandedSections.details}
            onToggle={() => toggleSection("details")}
            onLeadUpdated={handleLeadUpdated}
          />
        </div>
      </div>
      <div className="flex-1 bg-white dark:bg-gray-800">
        <CommentsAndActivities
          lead={currentLead}
          onLeadUpdated={handleLeadUpdated}
          key={currentLead._id}
        />
      </div>
    </div>
  );
};

export default LeadDetailsPanel;

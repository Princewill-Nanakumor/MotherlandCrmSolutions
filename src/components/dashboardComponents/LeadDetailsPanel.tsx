// src/components/dashboardComponents/LeadDetailsPanel.tsx
"use client";

import React, { FC, useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Lead } from "@/types/leads";
import { LeadHeader } from "../leads/leadDetailsPanel/LeadHeader";
import { ContactSection } from "../leads/leadDetailsPanel/ContactSection";
import { DetailsSection } from "../leads/leadDetailsPanel/DetailsSection";
import LeadStatus from "../leads/leadDetailsPanel/LeadStatus";
import CommentsAndActivities from "../leads/leadDetailsPanel/CommentsAndActivities";
import AdsImageSlider from "../ads/AdsImageSlider";
import { useQueryClient } from "@tanstack/react-query";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { useSession } from "next-auth/react";
import { LEAD_UPDATED_EVENT, getLeadChannelName } from "@/libs/realtime";
import { getAblyRealtimeClient } from "@/libs/ablyClient";

interface LeadDetailsPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => Promise<boolean>;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

/** Look up a single lead inside whatever shape leads-cache happens to be in. */
function findLeadInQueryData(data: unknown, leadId: string): Lead | undefined {
  if (Array.isArray(data)) {
    return (data as Lead[]).find((l) => l?._id === leadId);
  }
  if (data && typeof data === "object") {
    const d = data as { data?: Lead[]; leads?: Lead[] };
    if (Array.isArray(d.data)) return d.data.find((l) => l?._id === leadId);
    if (Array.isArray(d.leads)) return d.leads.find((l) => l?._id === leadId);
  }
  return undefined;
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
  const { data: session } = useSession();
  const [currentLead, setCurrentLead] = useState<Lead | null>(lead);
  const [isClosing, setIsClosing] = useState(false);
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

  // Realtime sync. Instead of refetching every leads-list query, we
  //   - re-fetch ONLY the single lead detail (server is source of truth), and
  //   - invalidate the comments/activities for this lead.
  // The other open list views are kept fresh via their own ADMIN_LEADS_UPDATED
  // subscription rather than us forcing a global refetch from this panel.
  useEffect(() => {
    if (!isOpen || !lead?._id || !session?.user?.id) return;

    let channel: {
      unsubscribe: (
        eventName: string,
        listener: (message: { data?: unknown }) => void,
      ) => void;
      detach: () => Promise<void>;
    } | null = null;
    let messageListener: ((message: { data?: unknown }) => void) | null = null;
    let channelName: string | null = null;
    let realtimeClient: ReturnType<typeof getAblyRealtimeClient> | null = null;
    let didSubscribe = false;
    let isDisposed = false;

    const setupRealtime = async () => {
      try {
        const scopeResponse = await apiCallWithSessionRefresh(
          "/api/ably/scope",
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (!scopeResponse.ok) {
          if (scopeResponse.status === 401) return;
          throw new Error(
            `Failed to resolve realtime scope: ${scopeResponse.status}`,
          );
        }

        const scopeData = (await scopeResponse.json()) as {
          adminScope?: string;
        };
        const adminScope = scopeData.adminScope;
        if (!adminScope || isDisposed) return;

        const realtime = getAblyRealtimeClient(session.user.id);
        realtimeClient = realtime;
        channelName = getLeadChannelName(adminScope, lead._id);
        const ablyChannel = realtime.channels.get(channelName);
        channel = ablyChannel;

        const attachWithRetry = async () => {
          try {
            await ablyChannel.attach();
            return true;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            const isTransientConnectionState =
              message.toLowerCase().includes("connection closed") ||
              message.toLowerCase().includes("connection failed") ||
              message.toLowerCase().includes("disconnected");

            if (!isTransientConnectionState) {
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 800));
            try {
              realtime.connect?.();
            } catch {
              /* ignore */
            }
            try {
              await ablyChannel.attach();
              return true;
            } catch {
              return false;
            }
          }
        };

        const attached = await attachWithRetry();
        if (!attached || isDisposed) {
          return;
        }

        messageListener = async () => {
          try {
            const response = await apiCallWithSessionRefresh(
              `/api/leads/${lead._id}`,
              {
                method: "GET",
                cache: "no-store",
              },
            );
            if (!response.ok) return;
            const freshLead = (await response.json()) as Lead;
            if (!freshLead?._id || isDisposed) return;

            previousStatusRef.current = freshLead.status;
            previousLeadRef.current = freshLead;
            setCurrentLead(freshLead);

            // Targeted invalidation of THIS lead's timeline, not all leads.
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: ["comments", lead._id],
                exact: true,
              }),
              queryClient.invalidateQueries({
                queryKey: ["activities", lead._id],
                exact: true,
              }),
            ]);
          } catch (error) {
            console.error(
              "Failed to sync lead details from realtime event:",
              error,
            );
          }
        };

        ablyChannel.subscribe(LEAD_UPDATED_EVENT, messageListener);
        didSubscribe = true;
      } catch (error) {
        console.error(
          "Failed to initialize panel realtime subscription:",
          error,
        );
      }
    };

    setupRealtime().catch((error) => {
      console.error("Panel realtime setup failed:", error);
    });

    return () => {
      isDisposed = true;
      void (async () => {
        if (didSubscribe && channel && messageListener) {
          channel.unsubscribe(LEAD_UPDATED_EVENT, messageListener);
        }
        if (channel) {
          try {
            await channel.detach();
          } catch (error) {
            console.error("Failed to detach panel realtime channel:", error);
          }
        }
        if (realtimeClient && channelName) {
          try {
            realtimeClient.channels.release(channelName);
          } catch (error) {
            console.error("Failed to release panel realtime channel:", error);
          }
        }
      })();
    };
  }, [isOpen, lead?._id, queryClient, session?.user?.id]);

  // Single subscription to the leads cache. Earlier we had two effects doing
  // the same job — one debounced subscriber and one mount-only check — which
  // raced with optimistic updates.
  useEffect(() => {
    if (!isOpen || !lead?._id) return;

    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const reconcile = () => {
      const allLeadKeys = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["leads"] });
      let candidate: Lead | undefined;
      let candidateUpdatedAt = 0;
      for (const q of allLeadKeys) {
        const found = findLeadInQueryData(q.state.data, lead._id);
        if (!found) continue;
        const ts = found.updatedAt
          ? new Date(found.updatedAt).getTime()
          : 0;
        if (ts >= candidateUpdatedAt) {
          candidate = found;
          candidateUpdatedAt = ts;
        }
      }
      if (!candidate) return;

      const timeSinceLastManualUpdate =
        Date.now() - lastManualUpdateRef.current;
      if (timeSinceLastManualUpdate <= 500) return;

      const currentTs = currentLead?.updatedAt
        ? new Date(currentLead.updatedAt).getTime()
        : 0;
      if (candidate.status === currentLead?.status && candidateUpdatedAt <= currentTs) {
        return;
      }

      previousStatusRef.current = candidate.status;
      setCurrentLead(candidate);
    };

    reconcile();

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.query.queryKey[0] === "leads") {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(reconcile, 100);
      }
    });

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      unsubscribe();
    };
  }, [isOpen, lead?._id, queryClient, currentLead?.status, currentLead?.updatedAt]);

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
      previousLeadRef.current = updatedLead;
      lastManualUpdateRef.current = Date.now();
      setCurrentLead(updatedLead);

      const result = await onLeadUpdatedRef.current(updatedLead);
      return result;
    } catch (error) {
      console.error("Error in handleLeadUpdated:", error);
      return false;
    }
  }, []);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 250);
  }, [isClosing, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleRequestClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, handleRequestClose]);

  // Title management: a single effect, with no setInterval spam. The previous
  // implementation set the title every 200ms forever which thrashes the
  // browser tab and prevents legitimate code (e.g. dashboard layout) from
  // managing its own title. We just set it on open/close/lead change.
  useEffect(() => {
    if (isOpen && currentLead) {
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title;
      }
      const fullName =
        `${currentLead.firstName || ""} ${currentLead.lastName || ""}`.trim();
      const leadTitle = fullName || "Lead Details";
      document.title = `${leadTitle} - Motherland CRM`;
      return;
    }
    if (!isOpen && originalTitleRef.current) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = "";
    }
  }, [isOpen, currentLead]);

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
    <motion.div
      className="fixed right-0 z-50 flex bg-white border-l-2 dark:bg-gray-800"
      style={{
        width: "80vw",
        maxWidth: "1200px",
        top: "80px",
        bottom: "80px",
        height: "calc(100vh - 160px)",
      }}
      initial={{ x: "100%" }}
      animate={{ x: isClosing ? "100%" : 0 }}
      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex flex-col w-2/5 border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
        <LeadHeader
          lead={currentLead}
          onClose={handleRequestClose}
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
    </motion.div>
  );
};

export default LeadDetailsPanel;

// src/components/dashboardComponents/LeadDetailsPanel.tsx
"use client";

import React, { FC, useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";
import { LeadHeader } from "../leads/leadDetailsPanel/LeadHeader";
import { ContactSection } from "../leads/leadDetailsPanel/ContactSection";
import { DetailsSection } from "../leads/leadDetailsPanel/DetailsSection";
import LeadStatus from "../leads/leadDetailsPanel/LeadStatus";
import CommentsAndActivities from "../leads/leadDetailsPanel/CommentsAndActivities";
import AdsImageSlider from "../ads/AdsImageSlider";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { useSession } from "next-auth/react";
import { LEAD_UPDATED_EVENT, getLeadChannelName } from "@/libs/realtime";
import {
  getAblyLeadRealtimeClient,
  releaseAblyLeadRealtimeClient,
} from "@/libs/ablyLeadClient";
import {
  assignedToEquals,
  refetchLeadActivities,
} from "@/lib/leadActivitiesQuery";

interface LeadDetailsPanelProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated: (updatedLead: Lead) => Promise<boolean>;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrevious: boolean;
  hasNext: boolean;
  users?: User[];
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

/** Keep list caches aligned with GET /api/leads/[id] so reconcile never re-applies masked contact. */
function mergeContactIntoListCaches(
  queryClient: QueryClient,
  leadId: string,
  email: string,
  phone: string,
) {
  const patch = (old: unknown): unknown => {
    const apply = (l: Lead): Lead =>
      l._id === leadId ? { ...l, email, phone } : l;
    if (Array.isArray(old)) {
      return (old as Lead[]).map(apply);
    }
    if (
      old &&
      typeof old === "object" &&
      Array.isArray((old as { leads?: Lead[] }).leads)
    ) {
      const d = old as { leads: Lead[]; total?: number; totalAll?: number };
      return { ...d, leads: d.leads.map(apply) };
    }
    return old;
  };
  queryClient.setQueriesData(
    { predicate: (q) => q.queryKey[0] === "leads" },
    patch,
  );
  queryClient.setQueriesData(
    { predicate: (q) => q.queryKey[0] === "assignedLeads" },
    patch,
  );
}

export const LeadDetailsPanel: FC<LeadDetailsPanelProps> = ({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onNavigate,
  hasPrevious,
  hasNext,
  users,
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
  /** Unmasked email/phone for the open lead; list queries may still be masked. */
  const unmaskedForPanelRef = useRef<{
    leadId: string;
    email: string;
    phone: string;
  } | null>(null);
  const lastPanelLeadIdRef = useRef<string | null>(null);
  const currentLeadRef = useRef<Lead | null>(lead);

  useEffect(() => {
    currentLeadRef.current = currentLead;
  }, [currentLead]);

  useEffect(() => {
    if (lead) {
      if (lastPanelLeadIdRef.current !== lead._id) {
        unmaskedForPanelRef.current = null;
        lastPanelLeadIdRef.current = lead._id;
      }
      previousStatusRef.current = lead.status;
      previousLeadRef.current = lead;
      setCurrentLead(lead);
    }
  }, [lead]);

  // List APIs (e.g. /api/leads/assigned) may return masked contact fields; load
  // full contact for the same lead the user is already authorized to open.
  useEffect(() => {
    if (!isOpen || !lead?._id || !session?.user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiCallWithSessionRefresh(`/api/leads/${lead._id}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Lead;
        if (!data?._id || cancelled) return;

        unmaskedForPanelRef.current = {
          leadId: data._id,
          email: data.email,
          phone: data.phone ?? "",
        };
        mergeContactIntoListCaches(
          queryClient,
          data._id,
          data.email,
          data.phone ?? "",
        );
        setCurrentLead((prev) =>
          prev && prev._id === data._id
            ? {
                ...prev,
                email: data.email,
                phone: data.phone,
                assignedTo: data.assignedTo ?? null,
                status: data.status ?? prev.status,
                updatedAt: data.updatedAt ?? prev.updatedAt,
              }
            : prev,
        );
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, lead?._id, session?.user?.id, queryClient]);

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
      state?: string;
    } | null = null;
    let messageListener: ((message: { data?: unknown }) => void) | null = null;
    let channelName: string | null = null;
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

        const realtime = getAblyLeadRealtimeClient(session.user.id, lead._id);
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
            // Invalidate timeline caches immediately — do not wait on GET /leads/[id].
            // Otherwise a failed/slow refetch leaves comments stale after remote deletes.
            if (!isDisposed) {
              await queryClient.invalidateQueries({
                queryKey: ["comments", lead._id],
                exact: true,
              });
              await refetchLeadActivities(queryClient, [lead._id]);
            }

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

            unmaskedForPanelRef.current = {
              leadId: freshLead._id,
              email: freshLead.email,
              phone: freshLead.phone ?? "",
            };
            mergeContactIntoListCaches(
              queryClient,
              freshLead._id,
              freshLead.email,
              freshLead.phone ?? "",
            );
            previousStatusRef.current = freshLead.status;
            previousLeadRef.current = freshLead;
            setCurrentLead(freshLead);
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
        // Do not explicitly detach here. During rapid close/reopen, detach can race
        // with the next attach and produce noisy "state = detached" SDK errors.
        // Releasing/closing the lead-scoped realtime client below is sufficient.
        if (lead?._id) {
          releaseAblyLeadRealtimeClient(lead._id);
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
      const cache = queryClient.getQueryCache();
      const allLeadKeys = [
        ...cache.findAll({ queryKey: ["leads"] }),
        ...cache.findAll({ queryKey: ["assignedLeads"] }),
      ];
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

      const panelLead = currentLeadRef.current;
      const currentTs = panelLead?.updatedAt
        ? new Date(panelLead.updatedAt).getTime()
        : 0;
      const assignmentUnchanged = assignedToEquals(
        candidate.assignedTo,
        panelLead?.assignedTo,
      );
      if (
        candidate.status === panelLead?.status &&
        candidateUpdatedAt <= currentTs &&
        assignmentUnchanged
      ) {
        return;
      }

      const merged =
        unmaskedForPanelRef.current?.leadId === candidate._id
          ? {
              ...candidate,
              email: unmaskedForPanelRef.current.email,
              phone: unmaskedForPanelRef.current.phone,
            }
          : candidate;

      previousStatusRef.current = merged.status;
      setCurrentLead(merged);
    };

    reconcile();

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === "updated" &&
        (event.query.queryKey[0] === "leads" ||
          event.query.queryKey[0] === "assignedLeads")
      ) {
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
      unmaskedForPanelRef.current = {
        leadId: updatedLead._id,
        email: updatedLead.email,
        phone: updatedLead.phone ?? "",
      };
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
          <LeadStatus
            lead={currentLead}
            users={users}
            onLeadUpdated={handleLeadUpdated}
          />
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
            users={users}
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

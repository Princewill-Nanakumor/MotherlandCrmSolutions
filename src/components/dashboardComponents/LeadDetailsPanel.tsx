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
import {
  ADMIN_LEADS_UPDATED_EVENT,
  getTenantChannelName,
} from "@/libs/realtime";
import { getAblyRealtimeClient } from "@/libs/ablyClient";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { refetchLeadActivities } from "@/lib/leadActivitiesQuery";
import {
  adminEventTouchesLead,
  handleAdminLeadPanelEvent,
  type AdminLeadPanelEvent,
} from "@/lib/leadPanelRealtimeSync";
import { applyRemoteLeadStatusToListCaches } from "@/lib/leadsListCache";
import { normalizeLeadStatusId } from "@/lib/leadClientUpdate";
import { useCurrentUserPermission } from "@/hooks/useCurrentUserPermission";
import { maskEmail, maskPhone } from "@/lib/contactMasking";

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
  const { shortName } = useAppBranding();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    details: true,
    contact: true,
    ads: true,
  });

  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { canViewEmails, canViewPhoneNumbers } = useCurrentUserPermission();
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
    if (!lead) return;

    const panelLead = currentLeadRef.current;
    const isNewLead = lastPanelLeadIdRef.current !== lead._id;

    // Prevent stale list-prop responses from overwriting the realtime detail
    // (which can cause the “status flash” before the realtime fetch restores it).
    if (panelLead && !isNewLead) {
      const parseTs = (v?: string) => {
        if (!v) return 0;
        const t = new Date(v).getTime();
        return Number.isFinite(t) ? t : 0;
      };

      // Prefer `updatedAt`, but fall back to other lead timestamps so we can
      // still compare even if the payload is missing/invalid `updatedAt`.
      const leadTs =
        parseTs(lead.updatedAt) ||
        parseTs(lead.statusChangedAt) ||
        parseTs(lead.lastActivityAt) ||
        parseTs(lead.createdAt);
      const panelTs =
        parseTs(panelLead.updatedAt) ||
        parseTs(panelLead.statusChangedAt) ||
        parseTs(panelLead.lastActivityAt) ||
        parseTs(panelLead.createdAt);
      if (leadTs > 0 && panelTs > 0 && leadTs <= panelTs) return;
    }

    if (isNewLead) {
      unmaskedForPanelRef.current = null;
      lastPanelLeadIdRef.current = lead._id;
    }

    previousStatusRef.current = lead.status;
    previousLeadRef.current = lead;
    setCurrentLead(lead);
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
        // Keep list caches aligned with what this viewer is allowed to see.
        mergeContactIntoListCaches(
          queryClient,
          data._id,
          canViewEmails
            ? data.email
            : maskEmail(data.email || "", false),
          canViewPhoneNumbers
            ? data.phone ?? ""
            : maskPhone(data.phone || "", false),
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
  }, [
    isOpen,
    lead?._id,
    session?.user?.id,
    queryClient,
    canViewEmails,
    canViewPhoneNumbers,
  ]);

  // Realtime sync: single tenant channel (filter by leadId / leadIds).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!isOpen || !lead?._id || !userId) return;

    const openLeadId = lead._id;
    let adminChannel: {
      unsubscribe: (
        eventName: string,
        listener: (message: { data?: unknown }) => void,
      ) => void;
      detach: () => Promise<void>;
    } | null = null;
    let adminChannelName: string | null = null;
    let adminMessageListener: ((message: { data?: unknown }) => void) | null =
      null;
    let adminSubscribed = false;
    let isDisposed = false;

    const syncLeadFromServer = async () => {
      try {
        if (!isDisposed) {
          await queryClient.invalidateQueries({
            queryKey: ["comments", openLeadId],
            exact: true,
          });
          await refetchLeadActivities(queryClient, [openLeadId]);
        }

        const response = await apiCallWithSessionRefresh(
          `/api/leads/${openLeadId}`,
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
        applyRemoteLeadStatusToListCaches(
          queryClient,
          freshLead._id,
          normalizeLeadStatusId(freshLead.status),
          { touchActivity: true },
        );
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

    const eventTouchesOpenLead = (data: unknown): boolean =>
      adminEventTouchesLead((data ?? {}) as AdminLeadPanelEvent, openLeadId);

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

        adminMessageListener = (message: { data?: unknown }) => {
          if (!eventTouchesOpenLead(message.data)) return;
          void handleAdminLeadPanelEvent(
            queryClient,
            openLeadId,
            (message.data ?? {}) as AdminLeadPanelEvent,
            syncLeadFromServer,
          );
        };

        const attachWithRetry = async (
          channel: { attach: () => Promise<unknown> },
          client: { connect?: () => void },
        ) => {
          try {
            await channel.attach();
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
              client.connect?.();
            } catch {
              /* ignore */
            }
            try {
              await channel.attach();
              return true;
            } catch {
              return false;
            }
          }
        };

        const adminRealtime = getAblyRealtimeClient(userId);
        adminChannelName = getTenantChannelName(adminScope);
        const ablyAdminChannel = adminRealtime.channels.get(adminChannelName);
        adminChannel = ablyAdminChannel;
        const adminAttached = await attachWithRetry(
          ablyAdminChannel,
          adminRealtime,
        );
        if (!adminAttached || isDisposed) return;

        ablyAdminChannel.subscribe(
          ADMIN_LEADS_UPDATED_EVENT,
          adminMessageListener,
        );
        adminSubscribed = true;
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
        if (adminSubscribed && adminChannel && adminMessageListener) {
          adminChannel.unsubscribe(
            ADMIN_LEADS_UPDATED_EVENT,
            adminMessageListener,
          );
          await adminChannel.detach().catch(() => undefined);
        }
        // Do not release the shared tenant channel — dashboard layout owns it.
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
        const ts = found.updatedAt ? new Date(found.updatedAt).getTime() : 0;
        if (ts >= candidateUpdatedAt) {
          candidate = found;
          candidateUpdatedAt = ts;
        }
      }
      if (!candidate) {
        const detailLead = queryClient.getQueryData<Lead>(["lead", lead._id]);
        if (detailLead) {
          candidate = detailLead;
          candidateUpdatedAt = detailLead.updatedAt
            ? new Date(detailLead.updatedAt).getTime()
            : 0;
        }
      } else {
        const detailLead = queryClient.getQueryData<Lead>(["lead", lead._id]);
        const detailTs = detailLead?.updatedAt
          ? new Date(detailLead.updatedAt).getTime()
          : 0;
        if (detailLead && detailTs >= candidateUpdatedAt) {
          candidate = detailLead;
          candidateUpdatedAt = detailTs;
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
      // Only apply list-cache data when it is strictly newer than what the
      // panel already has. This prevents a late/older list response from
      // overwriting realtime state.
      if (candidateUpdatedAt <= currentTs) return;

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
          event.query.queryKey[0] === "assignedLeads" ||
          (event.query.queryKey[0] === "lead" &&
            event.query.queryKey[1] === lead._id))
      ) {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(reconcile, 100);
      }
    });

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      unsubscribe();
    };
  }, [
    isOpen,
    lead?._id,
    queryClient,
    currentLead?.status,
    currentLead?.updatedAt,
  ]);

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
      document.title = `${leadTitle} - ${shortName}`;
      return;
    }
    if (!isOpen && originalTitleRef.current) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = "";
    }
  }, [isOpen, currentLead, shortName]);

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
      className="fixed inset-x-0 top-18 bottom-0 z-50 flex w-full flex-col overflow-hidden bg-white dark:bg-gray-800 md:inset-x-auto md:right-0 md:bottom-13 md:w-[min(80%,1200px)] md:flex-row md:border-l-2 md:border-gray-200 dark:md:border-gray-700"
      initial={{ x: "100%" }}
      animate={{ x: isClosing ? "100%" : 0 }}
      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:flex-row md:overflow-hidden">
        <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 md:h-full md:w-2/5 md:min-h-0 md:overflow-hidden md:border-b-0 md:border-r">
          <LeadHeader
            lead={currentLead}
            onClose={handleRequestClose}
            onNavigate={onNavigate}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
          />
          <div className="space-y-4 p-4 min-h-0 sm:space-y-6 sm:p-6 md:flex-1 md:overflow-y-auto">
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
        <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-white dark:bg-gray-800 md:overflow-hidden">
          <CommentsAndActivities
            lead={currentLead}
            onLeadUpdated={handleLeadUpdated}
            key={currentLead._id}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default LeadDetailsPanel;

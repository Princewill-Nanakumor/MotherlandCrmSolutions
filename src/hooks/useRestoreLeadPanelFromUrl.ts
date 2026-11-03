"use client";

import { useEffect, useRef } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { Lead } from "@/types/leads";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { getLiveLeadParam } from "@/lib/liveSearchParams";
import {
  findLeadByUrlParam,
  leadMatchesUrlParam,
} from "@/lib/leadUrlParam";

type UseRestoreLeadPanelFromUrlArgs = {
  searchParams: URLSearchParams | ReadonlyURLSearchParams | null;
  leads: Lead[];
  isRefetching: boolean;
  selectedLead: Lead | null;
  setSelectedLead: (lead: Lead | null) => void;
  setIsPanelOpen: (open: boolean) => void;
  /** When true, clear selection if URL has no `lead` (agent leads). */
  clearSelectionWhenNoLeadParam?: boolean;
  isPanelOpen?: boolean;
};

/**
 * Re-open the lead details panel from the URL `lead=` param after refresh /
 * deep link. Selection is not persisted in the store.
 */
export function useRestoreLeadPanelFromUrl({
  searchParams,
  leads,
  isRefetching,
  selectedLead,
  setSelectedLead,
  setIsPanelOpen,
  clearSelectionWhenNoLeadParam = false,
  isPanelOpen = false,
}: UseRestoreLeadPanelFromUrlArgs): void {
  const urlLeadRestoreRef = useRef<string | null>(null);

  useEffect(() => {
    // While a new search is in flight, `leads` is still the previous page.
    if (isRefetching) return;

    const leadIdParam = getLiveLeadParam(searchParams);
    if (!leadIdParam) {
      urlLeadRestoreRef.current = null;
      if (clearSelectionWhenNoLeadParam && (isPanelOpen || selectedLead)) {
        setIsPanelOpen(false);
        setSelectedLead(null);
      }
      return;
    }

    const fromList = findLeadByUrlParam(leads, leadIdParam);
    if (fromList) {
      urlLeadRestoreRef.current = leadIdParam;
      if (!selectedLead || selectedLead._id !== fromList._id) {
        setIsPanelOpen(true);
        setSelectedLead(fromList);
      } else if (clearSelectionWhenNoLeadParam && !isPanelOpen) {
        setIsPanelOpen(true);
      }
      return;
    }

    if (selectedLead && leadMatchesUrlParam(selectedLead, leadIdParam)) {
      urlLeadRestoreRef.current = leadIdParam;
      if (clearSelectionWhenNoLeadParam && !isPanelOpen) {
        setIsPanelOpen(true);
      }
      return;
    }

    if (urlLeadRestoreRef.current === leadIdParam) return;

    let cancelled = false;
    urlLeadRestoreRef.current = leadIdParam;
    void (async () => {
      try {
        const response = await apiCallWithSessionRefresh(
          `/api/leads/${encodeURIComponent(leadIdParam)}`,
          { cache: "no-store" },
        );
        if (!response.ok || cancelled) {
          if (!cancelled) urlLeadRestoreRef.current = null;
          return;
        }
        const fetched = (await response.json()) as Lead;
        if (cancelled || !fetched?._id) return;
        setIsPanelOpen(true);
        setSelectedLead(fetched);
      } catch {
        if (!cancelled) urlLeadRestoreRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally omit selectedLead/isPanelOpen from deps: list/URL changes
    // drive restore; including selection would re-fetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, leads, isRefetching, clearSelectionWhenNoLeadParam]);
}

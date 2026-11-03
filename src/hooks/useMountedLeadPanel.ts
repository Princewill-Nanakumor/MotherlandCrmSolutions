"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead } from "@/types/leads";

/**
 * Keep the last selected lead mounted while the details panel exits, so
 * `onClose` can clear table selection immediately without unmounting mid-slide.
 */
export function useMountedLeadPanel(selectedLead: Lead | null) {
  const [mountedLead, setMountedLead] = useState<Lead | null>(null);
  const selectedRef = useRef(selectedLead);
  selectedRef.current = selectedLead;

  useEffect(() => {
    if (selectedLead) setMountedLead(selectedLead);
  }, [selectedLead]);

  const clearMountedLead = useCallback(() => {
    // A new row may have been clicked during the exit animation.
    if (selectedRef.current) return;
    setMountedLead(null);
  }, []);

  return {
    mountedLead,
    panelOpen: selectedLead != null,
    clearMountedLead,
  };
}

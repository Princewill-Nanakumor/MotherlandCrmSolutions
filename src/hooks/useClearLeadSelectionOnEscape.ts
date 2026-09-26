"use client";

import { useEffect } from "react";
import { isLeadSelectionEscapeBlocked } from "@/lib/leadSelectionEscape";

/** Clears lead checkbox selection when Escape is pressed (if no overlay owns it). */
export function useClearLeadSelectionOnEscape(
  enabled: boolean,
  clearSelection: () => void,
) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (isLeadSelectionEscapeBlocked()) return;
      event.preventDefault();
      clearSelection();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, clearSelection]);
}

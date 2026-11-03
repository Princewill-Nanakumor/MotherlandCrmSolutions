"use client";

import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import type { Row } from "@tanstack/react-table";
import type { Lead } from "@/types/leads";
import { useLeadsTableScrollElement } from "@/components/leads/LeadsTableScroll";

/** Approx lead row height (py-3.5 cells + borders). */
const LEAD_TABLE_ROW_ESTIMATE_PX = 52;

/** Always virtualize above this — keeps panel open/close off the full-page DOM. */
const VIRTUALIZE_ROW_THRESHOLD = 40;

export type VirtualizedLeadRows = {
  virtualize: boolean;
  virtualItems: VirtualItem[];
  paddingTop: number;
  paddingBottom: number;
  measureElement: (node: Element | null) => void;
};

/**
 * Window the leads table body to the scroll host (LeadsTableScroll).
 * Below the threshold, render every row (no spacers).
 */
export function useVirtualizedLeadRows(
  rows: Row<Lead>[],
): VirtualizedLeadRows {
  const scrollElement = useLeadsTableScrollElement();
  const virtualize = rows.length > VIRTUALIZE_ROW_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: virtualize ? rows.length : 0,
    getScrollElement: () => scrollElement,
    estimateSize: () => LEAD_TABLE_ROW_ESTIMATE_PX,
    overscan: 12,
    enabled: virtualize,
  });

  if (!virtualize) {
    return {
      virtualize: false,
      virtualItems: [],
      paddingTop: 0,
      paddingBottom: 0,
      measureElement: () => {},
    };
  }

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0]!.start : 0;
  const totalSize = virtualizer.getTotalSize();
  const last = virtualItems[virtualItems.length - 1];
  const paddingBottom =
    virtualItems.length > 0 && last ? totalSize - last.end : 0;

  return {
    virtualize: true,
    virtualItems,
    paddingTop,
    paddingBottom,
    measureElement: virtualizer.measureElement,
  };
}

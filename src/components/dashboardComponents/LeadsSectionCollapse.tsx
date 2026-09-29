"use client";

import type { ReactNode } from "react";

/**
 * Height-aware show/hide for leads header & filter bars.
 * Collapses to 0 height (no leftover gap) while animating opacity.
 */
export function LeadsSectionCollapse({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid shrink-0 transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
        open
          ? "grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid-rows-[0fr] opacity-0"
      }`}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

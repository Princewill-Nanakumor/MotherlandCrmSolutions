"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const LeadsTableScrollContext = createContext<HTMLElement | null>(null);

export function useLeadsTableScrollElement(): HTMLElement | null {
  return useContext(LeadsTableScrollContext);
}

/**
 * Scroll host for leads tables. Owns overflow so row virtualization can
 * measure against a single scroll parent (see useVirtualizedLeadRows).
 */
export function LeadsTableScroll({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  return (
    <LeadsTableScrollContext.Provider value={scrollEl}>
      <div ref={setScrollEl} className={className}>
        {children}
      </div>
    </LeadsTableScrollContext.Provider>
  );
}

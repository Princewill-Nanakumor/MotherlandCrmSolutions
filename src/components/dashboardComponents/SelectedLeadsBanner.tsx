// src/components/dashboardComponents/SelectedLeadsBanner.tsx
"use client";

import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectedLeads, useClearSelection } from "@/stores/leadsStore";
import { canAccessAllLeads } from "@/lib/roles";

/**
 * Shows a sticky banner on the all-leads page when leads are checkbox-selected.
 * Displays the count only; Cancel selection clears the selection.
 * Selection is also cleared when leaving the all-leads list page.
 */
export function SelectedLeadsBanner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const selectedLeads = useSelectedLeads();
  const clearSelection = useClearSelection();

  const canUseAllLeads = canAccessAllLeads(session?.user);
  const count = selectedLeads.length;
  const isAllLeadsPage = pathname === "/dashboard/all-leads";

  // Lead selection lives in a global store; clear it when leaving the list
  // so the banner/checkboxes don't come back on the next visit.
  useEffect(() => {
    if (!isAllLeadsPage && count > 0) {
      clearSelection();
    }
  }, [isAllLeadsPage, count, clearSelection]);

  if (!canUseAllLeads || count === 0 || !isAllLeadsPage) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 pl-16 pr-8 py-2 text-sm text-indigo-900 border-b border-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-100">
      <span className="font-medium">
        {count} lead{count !== 1 ? "s" : ""} selected
      </span>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => clearSelection()}
        className="shrink-0"
      >
        <X className="mr-1.5 h-4 w-4" />
        Cancel selection
      </Button>
    </div>
  );
}

"use client";

import { LeadsHeader } from "./LeadHeader";
import {
  FilterControlsLoadingShell,
  TableSkeleton,
} from "./LeadsLoadingState";

const EMPTY_COUNTS = { total: 0, filtered: 0, countries: 0 };

interface AllLeadsPageLoadingShellProps {
  showHeader?: boolean;
}

/**
 * Single bootstrap UI for /dashboard/all-leads.
 * Used by dynamic import, session/subscription wait, and first leads fetch.
 */
export function AllLeadsPageLoadingShell({
  showHeader = true,
}: AllLeadsPageLoadingShellProps) {
  return (
    <div
      className="flex flex-col h-full min-w-0 max-w-full overflow-x-hidden border rounded-lg bg-background dark:bg-gray-800"
      data-testid="all-leads-bootstrap-shell"
    >
      {showHeader && (
        <LeadsHeader shouldShowLoading counts={EMPTY_COUNTS} />
      )}
      <FilterControlsLoadingShell />
      <div className="flex-1 min-w-0 px-4 pb-4 overflow-auto sm:px-8">
        <TableSkeleton />
      </div>
    </div>
  );
}

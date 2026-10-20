"use client";

import { LeadsHeader } from "./LeadHeader";
import {
  FilterControlsLoadingShell,
  TableSkeleton,
} from "./LeadsLoadingState";

const EMPTY_COUNTS = { total: 0, filtered: 0, countries: 0 };

interface AllLeadsPageLoadingShellProps {
  showHeader?: boolean;
  showControls?: boolean;
}

/**
 * Single bootstrap UI for /dashboard/all-leads.
 * Used by dynamic import, session/subscription wait, and first leads fetch.
 */
export function AllLeadsPageLoadingShell({
  showHeader = true,
  showControls = true,
}: AllLeadsPageLoadingShellProps) {
  return (
    <div
      className="flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-lg border bg-background dark:bg-gray-800"
      data-testid="all-leads-bootstrap-shell"
    >
      {showHeader && (
        <div className="shrink-0">
          <LeadsHeader shouldShowLoading counts={EMPTY_COUNTS} />
        </div>
      )}
      {showControls && (
        <div className="shrink-0">
          <FilterControlsLoadingShell compactTop={!showHeader} />
        </div>
      )}
      <div className="min-h-65 min-w-0 flex-1 px-4 pb-4 sm:px-6">
        <TableSkeleton />
      </div>
    </div>
  );
}

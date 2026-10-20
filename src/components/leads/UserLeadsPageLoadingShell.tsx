"use client";

import { UserLeadsHeader } from "./UserLeadsHeader";
import {
  FilterControlsLoadingShell,
  TableSkeleton,
} from "./UserLeadsLoadingStates";

const EMPTY_COUNTS = { total: 0, filtered: 0, countries: 0 };

interface UserLeadsPageLoadingShellProps {
  showHeader?: boolean;
  showControls?: boolean;
}

/**
 * Subscription bootstrap UI for /dashboard/leads.
 * After subscription resolves, the real table mounts (in-table cell skeleton).
 */
export function UserLeadsPageLoadingShell({
  showHeader = true,
  showControls = true,
}: UserLeadsPageLoadingShellProps) {
  return (
    <div
      className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-auto rounded-lg border bg-background dark:bg-gray-800"
      data-testid="user-leads-bootstrap-shell"
    >
      {showHeader && (
        <UserLeadsHeader shouldShowLoading counts={EMPTY_COUNTS} />
      )}
      {showControls && <FilterControlsLoadingShell compactTop={!showHeader} />}
      <div className="min-h-65 min-w-0 flex-1 px-4 pb-4 sm:px-6">
        <TableSkeleton />
      </div>
    </div>
  );
}

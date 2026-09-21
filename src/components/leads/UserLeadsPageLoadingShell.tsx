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
      className="flex flex-col h-full min-h-0 min-w-0 max-w-full overflow-x-hidden overflow-y-auto border rounded-lg bg-background dark:bg-gray-800"
      data-testid="user-leads-bootstrap-shell"
    >
      {showHeader && (
        <UserLeadsHeader shouldShowLoading counts={EMPTY_COUNTS} />
      )}
      {showControls && <FilterControlsLoadingShell />}
      <div className="flex-1 min-h-65 min-w-0 px-4 pb-4 sm:px-8">
        <TableSkeleton />
      </div>
    </div>
  );
}

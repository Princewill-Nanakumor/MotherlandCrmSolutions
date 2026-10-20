"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_PAGE_SHELL_CLASS } from "@/lib/dashboardPageShell";
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";

export function AdminManagementPageSkeleton() {
  return (
    <div className={`${DASHBOARD_PAGE_SHELL_CLASS} space-y-6`}>
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Admin Management</h1>
          <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
            Manage all administrators and monitor their activities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:gap-3">
          <Skeleton className="h-6 w-28 rounded-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-8 w-24 rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <Skeleton className="mb-3 h-4 w-24 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-8 w-16 bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-56 max-w-full bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

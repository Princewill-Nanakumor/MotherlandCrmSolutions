"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DASHBOARD_PAGE_SHELL_CLASS } from "@/lib/dashboardPageShell";
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";

export function AdminDetailsPageSkeleton() {
  return (
    <div className={`${DASHBOARD_PAGE_SHELL_CLASS} space-y-6`}>
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-center sm:gap-4">
          <Skeleton className="h-8 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
          <div className="min-w-0">
            <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Administrator</h1>
            <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
              Administrator Details
            </p>
          </div>
        </div>
        <Skeleton className="h-8 w-24 shrink-0 rounded-md bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-6 w-48 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-4 w-64 max-w-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <Skeleton className="mb-2 h-4 w-20 bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-7 w-14 bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="mb-4 h-5 w-32 bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

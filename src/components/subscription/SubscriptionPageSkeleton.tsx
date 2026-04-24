// src/components/subscription/SubscriptionPageSkeleton.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function SubscriptionPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 rounded-xl border dark:bg-gray-800">
      <div className="container px-4 py-8 mx-auto">
        {/* Header skeleton */}
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto mb-2 h-9 w-64 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="mx-auto h-5 w-80 bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Trial status card skeleton */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-6 w-40 bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full max-w-md bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        {/* Plans grid skeleton (3 cards) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            >
              <Skeleton className="mb-2 h-6 w-24 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="mb-4 h-8 w-16 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700" />
              </div>
              <Skeleton className="mt-6 h-10 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// src/components/importPageComponents/UsageLimitsSkeleton.tsx
"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UsageLimitsSkeleton() {
  return (
    <Card className="mx-6 mt-6 bg-gray-50 border-gray-200 dark:border-gray-700 dark:bg-gray-800 mb-5">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <Skeleton className="h-2 w-full rounded" />
          <Skeleton className="h-3 w-32 rounded" />
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-800/40 rounded">
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

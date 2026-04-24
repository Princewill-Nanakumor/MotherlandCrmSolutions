// src/components/dashboardComponents/LeadDetailsSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

export const LeadDetailsSkeleton = () => {
  return (
    <div className="h-screen bg-white dark:bg-gray-800 flex flex-col">
      <div
        className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        style={{
          height: "calc(100vh - 40px)",
        }}
      >
        {/* Left Panel - Lead Details Skeleton */}
        <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
          {/* Header Skeleton */}
          <div className="p-4 border-b-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-32 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-20 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Contact Section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-24 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>

            {/* Ads Section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16 bg-gray-200 dark:bg-gray-700" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-20 w-full bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-20 w-full bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>

            {/* Details Section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-20 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Comments Skeleton */}
        <div className="flex-1 bg-white dark:bg-gray-800 p-6">
          <div className="space-y-6">
            {/* Comments Header */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-10 w-full bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-3 w-16 bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-700" />
                  <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";

export function ProfileSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`min-h-screen ${className}`}>
      <div className="container mx-auto px-4 py-8 rounded-lg border">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold dark:!text-white !text-gray-900 mb-2">
              Your Profile
            </h1>
            <p className="dark:text-gray-300 text-gray-600">
              Manage your account settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="space-y-6">
                {/* Name fields skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                    <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div>
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                    <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
                {/* Email field skeleton */}
                <div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                {/* Phone field skeleton */}
                <div>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
                {/* Country field skeleton */}
                <div>
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-6">
            {/* Account Info Skeleton */}
            <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse"></div>
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse h-10 w-10"></div>
                    <div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Permissions Skeleton */}
            <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse"></div>
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse h-10 w-10"></div>
                    <div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

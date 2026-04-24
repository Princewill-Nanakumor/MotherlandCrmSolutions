// src/components/user/ProfileSkeleton.tsx
import React from "react";

export function ProfileSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`min-h-screen ${className}`}>
      <div className="container px-4 py-8 mx-auto border rounded-lg">
        {/* Header */}
        <div className="flex flex-col items-start mb-8 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold dark:text-white! text-gray-900! mb-2">
              Your Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your account settings
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Profile Card Skeleton */}
          <div className="space-y-6 lg:col-span-2">
            <div className="p-6 bg-white border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="w-40 h-6 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                <div className="w-32 h-10 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
              </div>
              <div className="space-y-6">
                {/* Name fields skeleton */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <div className="w-20 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                    <div className="w-full h-10 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                  </div>
                  <div>
                    <div className="w-20 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                    <div className="w-full h-10 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                  </div>
                </div>
                {/* Email field skeleton */}
                <div>
                  <div className="w-24 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-full h-10 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                </div>
                {/* Phone field skeleton */}
                <div>
                  <div className="w-24 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-full h-10 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                </div>
                {/* Country field skeleton */}
                <div>
                  <div className="w-16 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                  <div className="w-full h-10 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-6">
            {/* Account Info Skeleton */}
            <div className="p-6 bg-white border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
              <div className="w-40 h-6 mb-6 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 p-3 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse"></div>
                    <div>
                      <div className="w-24 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                      <div className="w-32 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Permissions Skeleton */}
            <div className="p-6 bg-white border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
              <div className="w-40 h-6 mb-6 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 p-3 bg-gray-200 rounded-lg dark:bg-gray-700 animate-pulse"></div>
                    <div>
                      <div className="w-24 h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
                      <div className="w-32 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
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

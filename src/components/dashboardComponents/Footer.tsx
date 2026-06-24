// src/components/dashboardComponents/Footer.tsx
"use client";

import React from "react";
import Image from "next/image";
import { useAppBranding } from "@/components/AppBrandingProvider";

export default function Navbar() {
  const { displayName } = useAppBranding();
  return (
    <nav className="px-6 py-4 border-t border-b border-gray-200 shadow-lg backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 dark:border-gray-700">
      <div className="flex items-center justify-center mx-auto max-w-7xl">
        <div className="flex items-center space-x-3">
          <div className="relative w-10 h-10 overflow-hidden">
            <Image
              src="/motherlandlogo.png"
              alt={`${displayName} Logo`}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
          <div className="text-lg font-bold text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            {displayName}
          </div>
        </div>
      </div>
    </nav>
  );
}

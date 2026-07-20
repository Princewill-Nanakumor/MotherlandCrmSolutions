// src/components/dashboardComponents/Footer.tsx
"use client";

import React from "react";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";

export default function Navbar() {
  const { displayName } = useAppBranding();
  return (
    <nav className="px-6 py-4 border-t border-b border-gray-200 shadow-lg backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 dark:border-gray-700">
      <div className="flex justify-center items-center mx-auto max-w-7xl">
        <div className="flex items-center space-x-3">
          <MotherlandLogo
            className="w-8 h-8 rounded-xl"
            title={`${displayName} Logo`}
          />
          <div className="text-lg font-bold text-transparent bg-clip-text bg-linear-to-r from-(--brand-from) to-(--brand-to)">
            {displayName}
          </div>
        </div>
      </div>
    </nav>
  );
}

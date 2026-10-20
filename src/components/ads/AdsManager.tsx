// src/components/ads/AdsManager.tsx
"use client";

import React from "react";
import { Megaphone } from "lucide-react";
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";
import { DASHBOARD_PAGE_SHELL_CLASS } from "@/lib/dashboardPageShell";

export default function AdsManager() {
  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS}>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 mb-4 rounded-full brand-soft-bg">
          <Megaphone className="w-10 h-10 brand-icon" />
        </div>
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Ads Manager</h1>
        <p className={`${DASHBOARD_PAGE_SUBTITLE_CLASS} mb-4`}>
          This feature is coming soon!
        </p>
        <span className="inline-block px-4 py-2 text-sm font-semibold rounded-full brand-chip">
          Stay tuned
        </span>
      </div>
    </div>
  );
}

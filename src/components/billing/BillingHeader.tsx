// src/components/billing/BillingHeader.tsx

"use client";

import React from "react";
import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";
import { DASHBOARD_PAGE_HEADER_CLASS } from "@/lib/dashboardPageShell";

// L8: this header is purely visual; no tabs are rendered here. Drop the
// unused `activeTab` / `onTabChange` props so callers don't pretend it
// reacts to them.
export default function BillingHeader() {
  return (
    <div
      className={`flex flex-col items-start min-w-0 ${DASHBOARD_PAGE_HEADER_CLASS}`}
    >
      <div className="min-w-0 max-w-full">
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Billing & Fund Account</h1>
        <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
          Fund your account securely
        </p>
      </div>
    </div>
  );
}

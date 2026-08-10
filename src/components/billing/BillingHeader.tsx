// src/components/billing/BillingHeader.tsx

"use client";

import React from "react";

// L8: this header is purely visual; no tabs are rendered here. Drop the
// unused `activeTab` / `onTabChange` props so callers don't pretend it
// reacts to them.
export default function BillingHeader() {
  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col items-start mb-6 min-w-0 sm:mb-8">
        <div className="min-w-0 max-w-full">
          <h1 className="mb-2 text-2xl font-bold wrap-break-word text-gray-900! sm:text-3xl dark:text-white!">
            Billing & Fund Account
          </h1>
          <p className="text-gray-600! dark:text-white!">
            Fund your account securely
          </p>
        </div>
      </div>
    </div>
  );
}

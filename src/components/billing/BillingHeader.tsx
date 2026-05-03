// src/components/billing/BillingHeader.tsx

"use client";

import React from "react";

// L8: this header is purely visual; no tabs are rendered here. Drop the
// unused `activeTab` / `onTabChange` props so callers don't pretend it
// reacts to them.
export default function BillingHeader() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start mb-8 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold dark:text-white! text-gray-900! mb-2">
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

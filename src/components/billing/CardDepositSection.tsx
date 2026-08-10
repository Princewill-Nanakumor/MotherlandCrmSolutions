// src/components/billing/CardDepositSection.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface CardDepositSectionProps {
  onSwitchToUsdt: () => void;
}

export default function CardDepositSection({
  onSwitchToUsdt,
}: CardDepositSectionProps) {
  return (
    <div className="box-border w-full min-w-0 max-w-full overflow-hidden p-4 text-center bg-gray-100 border border-gray-300 border-dashed rounded-lg sm:p-8 dark:bg-white/5 dark:border-white/10">
      <h3 className="mb-2 text-base font-medium text-gray-700! break-words sm:text-lg dark:text-white!">
        Card Deposit
      </h3>
      <p className="mb-4 text-sm text-gray-500! break-words dark:text-white! sm:text-base">
        Coming soon. Please use USDT deposits for now.
      </p>
      <Button
        onClick={onSwitchToUsdt}
        variant="outline"
        className="w-full max-w-full sm:w-auto"
      >
        Switch to USDT
      </Button>
    </div>
  );
}

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
    <div className="p-8 text-center bg-gray-100 border border-gray-300 border-dashed rounded-lg dark:bg-white/5 dark:border-white/10">
      <h3 className="text-lg font-medium text-gray-700! dark:text-white! mb-2">
        Card Deposit
      </h3>
      <p className="text-gray-500! dark:text-white! mb-4">
        Coming soon. Please use USDT deposits for now.
      </p>
      <Button
        onClick={onSwitchToUsdt}
        variant="outline"
      >
        Switch to USDT
      </Button>
    </div>
  );
}

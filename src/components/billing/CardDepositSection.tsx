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
    <div className="dark:bg-white/5 bg-gray-100 p-8 rounded-lg border border-dashed border-gray-300 dark:border-white/10 text-center">
      <h3 className="text-lg font-medium !text-gray-700 dark:!text-white mb-2">
        Card Deposit
      </h3>
      <p className="!text-gray-500 dark:!text-white mb-4">
        Coming soon. Please use USDT deposits for now.
      </p>
      <Button
        onClick={onSwitchToUsdt}
        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:to-blue-700 text-white rounded-lg transition"
      >
        Switch to USDT
      </Button>
    </div>
  );
}

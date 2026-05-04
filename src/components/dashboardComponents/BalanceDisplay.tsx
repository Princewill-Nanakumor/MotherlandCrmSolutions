// src/components/dashboardComponents/BalanceDisplay.tsx
"use client";
import React from "react";

export function BalanceDisplay({
  balance,
  loading,
}: {
  balance: number | undefined;
  loading: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <span className="text-xs font-semibold text-gray-700! dark:text-gray-200! inline-flex items-center gap-2">
      Balance:{" "}
      {loading ? (
        <span className="text-gray-500! dark:text-gray-400!">Loading...</span>
      ) : (
        <span className="text-green-600! dark:text-green-400!">
          {formatCurrency(balance ?? 0)}
        </span>
      )}
    </span>
  );
}

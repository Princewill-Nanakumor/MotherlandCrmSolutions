"use client";
import React, { useEffect, useState } from "react";

export function BalanceDisplay({
  balance,
  loading,
  onBalanceUpdate,
}: {
  balance: number | undefined;
  loading: boolean;
  onBalanceUpdate?: (newBalance: number) => void;
}) {
  const [localBalance, setLocalBalance] = useState<number | undefined>(balance);
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local balance when prop changes
  useEffect(() => {
    setLocalBalance(balance);
  }, [balance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Function to refresh balance
  const refreshBalance = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/subscription/status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const newBalance = data.balance || 0;
        setLocalBalance(newBalance);
        onBalanceUpdate?.(newBalance);
      }
    } catch (error) {
      console.error("Error refreshing balance:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <span className="text-xs font-semibold text-gray-700! dark:text-gray-200!">
      Balance:{" "}
      {loading || isUpdating ? (
        <span className="text-gray-500! dark:text-gray-400!">Loading...</span>
      ) : (
        <span className="text-green-600! dark:text-green-400!">
          {formatCurrency(localBalance || 0)}
        </span>
      )}
      <button
        onClick={refreshBalance}
        className="ml-2 text-blue-600! hover:text-blue-800! dark:text-blue-400! dark:hover:text-blue-300! text-xs underline"
        disabled={isUpdating}
      ></button>
    </span>
  );
}

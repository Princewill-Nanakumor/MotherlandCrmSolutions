// src/components/billing/BillingSidebar.tsx

"use client";

import React from "react";
import { CircleDollarSign } from "lucide-react";
import RecentTransactions from "./RecentTransactions";
import Support from "./Support";
import { Transaction } from "@/types/payment.types";

interface BillingSidebarProps {
  balance?: number;
  totalDeposits?: number;
  pendingAmount?: number;
  recentTransactions?: Transaction[];
  onTransactionClick?: (transactionId: string) => void;
  isLoading?: boolean;
  hasUnconfirmedPayment?: boolean; // Add this prop
}

export default function BillingSidebar({
  balance = 0,
  pendingAmount = 0,
  recentTransactions = [],
  onTransactionClick,
  isLoading = false,
  hasUnconfirmedPayment = false,
}: BillingSidebarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Account Balance */}
      <div className="p-4 transition-all duration-300 bg-white border border-gray-200 shadow-lg sm:p-6 dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10 hover:shadow-xl min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold dark:text-white! text-gray-900!">
            Account Balance
          </h3>
          <CircleDollarSign className="w-5 h-5 text-gray-500 dark:text-gray-400 " />
        </div>

        {isLoading ? (
          // Loading skeleton for account balance
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-24 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
              <div className="w-20 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse w-28"></div>
              <div className="w-16 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="w-16 h-4 bg-gray-200 rounded dark:bg-gray-700 animate-pulse"></div>
              <div className="w-20 h-4 bg-yellow-200 rounded dark:bg-yellow-800 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 transition-colors duration-200 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="text-gray-600! dark:text-white! font-medium">
                Balance
              </span>
              <span className="font-semibold text-gray-900! dark:text-white!">
                {formatCurrency(balance)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 transition-colors duration-200 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800">
              <span className="text-gray-600! dark:text-white! font-medium">
                Pending
              </span>
              <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                {formatCurrency(pendingAmount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions Component */}
      <RecentTransactions
        transactions={recentTransactions}
        onTransactionClick={onTransactionClick}
        isLoading={isLoading}
        disabled={hasUnconfirmedPayment}
      />

      {/* Support Component */}
      <Support />
    </div>
  );
}

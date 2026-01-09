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
    <div className="space-y-6">
      {/* Account Balance */}
      <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold dark:!text-white !text-gray-900">
            Account Balance
          </h3>
          <CircleDollarSign className="h-5 w-5 dark:text-gray-400 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer transition-colors duration-200" />
        </div>

        {isLoading ? (
          // Loading skeleton for account balance
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-28"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
              <div className="h-4 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse w-20"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
              <span className="!text-gray-600 dark:!text-white font-medium">
                Balance
              </span>
              <span className="font-semibold !text-gray-900 dark:!text-white">
                {formatCurrency(balance)}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
              <span className="!text-gray-600 dark:!text-white font-medium">
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

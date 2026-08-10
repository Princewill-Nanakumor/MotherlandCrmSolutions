// src/components/billing/RecentTransactions.tsx
"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { Transaction } from "@/types/payment.types";

interface RecentTransactionsProps {
  transactions?: Transaction[];
  onTransactionClick?: (transactionId: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

// Loading skeleton component
const TransactionSkeleton = () => (
  <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-white/5 dark:border-white/10 animate-pulse">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <div className="w-20 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
        <div className="w-16 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="w-24 h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
        <div className="w-16 h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
    </div>
  </div>
);

export default function RecentTransactions({
  transactions = [],
  onTransactionClick,
  isLoading = false,
  disabled = false,
}: RecentTransactionsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "text-green-600 dark:text-green-400";
      case "PENDING":
        return "text-yellow-600 dark:text-yellow-400";
      case "FAILED":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const handleTransactionClick = (transactionId: string) => {
    if (!onTransactionClick) {
      return;
    }
    onTransactionClick(transactionId);
  };

  return (
    <div className="p-4 bg-white border border-gray-200 shadow-lg sm:p-6 dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10 min-w-0 overflow-hidden">
      <h3 className="mb-4 text-lg font-semibold text-gray-900! dark:text-white!">
        Recent Transactions
      </h3>

      <div className="overflow-y-auto max-h-80 brand-scrollbar">
        <div className="pr-2 space-y-3">
          {isLoading ? (
            // Loading skeleton
            <>
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
              <TransactionSkeleton />
            </>
          ) : transactions.length === 0 ? (
            <div className="py-8 text-center">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-400" />
              <p className="text-gray-500! dark:text-white! text-sm">
                No transactions yet
              </p>
              <p className="text-gray-500! dark:text-white! text-xs">
                Your deposit history will appear here
              </p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => handleTransactionClick(transaction.id)}
                className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 transition-colors duration-200 ${
                  disabled ? "opacity-70" : ""
                } hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium dark:text-white! text-gray-900!">
                      {transaction.type}
                    </span>
                    <span
                      className={`text-sm font-medium ${getStatusColor(transaction.status)}`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500! dark:text-white!">
                      {formatDate(transaction.date)}
                    </span>
                    <span className="text-sm font-semibold dark:text-white! text-gray-900!">
                      {formatCurrency(transaction.amount)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

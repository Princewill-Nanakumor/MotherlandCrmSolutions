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
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 animate-pulse">
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
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
    <div className="dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl p-6 shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
      <h3 className="text-lg font-semibold dark:!text-white !text-gray-900 mb-4">
        Recent Transactions
      </h3>

      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
        <div className="space-y-3 pr-2">
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
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto dark:text-gray-400 text-gray-300 mb-3" />
              <p className="!text-gray-500 dark:!text-white text-sm">
                No transactions yet
              </p>
              <p className="!text-gray-500 dark:!text-white text-xs">
                Your deposit history will appear here
              </p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => handleTransactionClick(transaction.id)}
                className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 transition-colors duration-200 ${
                  disabled
                    ? "opacity-70"
                    : ""
                } hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer`}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium dark:!text-white !text-gray-900">
                      {transaction.type}
                    </span>
                    <span
                      className={`text-sm font-medium ${getStatusColor(transaction.status)}`}
                    >
                      {transaction.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs !text-gray-500 dark:!text-white">
                      {formatDate(transaction.date)}
                    </span>
                    <span className="text-sm font-semibold dark:!text-white !text-gray-900">
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

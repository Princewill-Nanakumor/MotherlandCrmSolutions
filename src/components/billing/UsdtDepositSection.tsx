// src/components/billing/UsdtDepositSection.tsx
"use client";

import React from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentRequestDetails from "./PaymentRequestDetails";
import { Payment } from "@/types/payment.types";

interface UsdtDepositSectionProps {
  amount: string;
  network: "TRC20" | "ERC20";
  isSubmitting: boolean;
  error: string | null;
  showInstructions: boolean;
  currentPayment: Payment | null;
  paymentConfirmed: boolean;
  onNetworkToggle: () => void;
  onAmountChange: (value: string) => void;
  onCreatePayment: (e: React.FormEvent) => Promise<void>;
  onConfirmPayment: () => void;
  onShowPaymentDetails: () => void;
  onToggleInstructions: () => void;
  onBackToDeposit: () => void;
  onPaymentExpired?: (payment: Payment) => void;
}

export default function UsdtDepositSection({
  amount,
  network,
  isSubmitting,
  error,
  showInstructions,
  currentPayment,
  paymentConfirmed,
  // onNetworkToggle,
  onAmountChange,
  onCreatePayment,
  onConfirmPayment,
  onShowPaymentDetails,
  onToggleInstructions,
  onBackToDeposit,
  onPaymentExpired,
}: UsdtDepositSectionProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreatePayment(e);
  };

  // If there's a current payment, show the payment details
  if (currentPayment) {
    return (
      <PaymentRequestDetails
        currentPayment={currentPayment}
        network={network}
        paymentConfirmed={paymentConfirmed}
        onConfirmPayment={onConfirmPayment}
        onShowPaymentDetails={onShowPaymentDetails}
        onBackToDeposit={onBackToDeposit}
        onPaymentExpired={onPaymentExpired}
      />
    );
  }

  return (
    <div className="overflow-hidden p-4 w-full min-w-0 max-w-full bg-white rounded-lg border border-gray-200 shadow-sm sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex flex-col gap-2 mb-6 min-w-0 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900! wrap-break-word sm:text-xl dark:text-white!">
          Cryptocurrency (USDT)
        </h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 mb-4 bg-red-50 rounded-lg border border-red-200 sm:p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-start min-w-0">
            <Info className="w-4 h-4 mt-0.5 mr-2 text-red-600 shrink-0 dark:text-red-400" />
            <span className="min-w-0 text-sm text-red-700! wrap-break-word dark:text-white!">
              {error}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6 min-w-0">
        <div className="mb-4 min-w-0">
          <p className="text-sm text-gray-600! wrap-break-word dark:text-white! sm:text-base">
            Deposit USDT (Tether) to your account. Please ensure you are sending
            funds through the <span className="font-semibold">{network}</span>{" "}
            network.
          </p>
        </div>

        <div className="p-3 mb-4 bg-yellow-50 rounded-lg border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="flex items-start min-w-0">
            <Info className="h-4 w-4 mt-0.5 mr-2 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div className="min-w-0">
              <h4 className="font-medium text-yellow-800! dark:text-white! text-sm">
                Important Notice
              </h4>
              <p className="text-xs text-gray-900! wrap-break-word dark:text-white!">
                {network === "TRC20"
                  ? "TRC20 deposits are faster and have lower fees (~1 USDT) compared to ERC20. After generating an address you have 1 hour to confirm the deposit."
                  : "ERC20 deposits may take longer and have higher gas fees (varies). After generating an address you have 1 hour to confirm the deposit."}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleInstructions}
          className="p-0 mb-2 text-sm text-purple-600 bg-transparent border-none cursor-pointer dark:text-purple-400 hover:underline"
        >
          {showInstructions ? "Hide" : "Show"} deposit instructions
        </button>

        {showInstructions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-gray-700! dark:text-white! mb-4">
            <h4 className="font-medium mb-2 text-gray-900! dark:text-white!">
              Deposit Instructions:
            </h4>
            <ol className="pl-5 space-y-1 list-decimal">
              <li>Enter the amount you want to deposit below</li>
              <li>Click &quot;Generate Deposit Address&quot;</li>
              <li>Copy the wallet address or scan the QR code</li>
              <li>Send the exact amount to the wallet address</li>
              <li>Click &quot;I Have Made the Payment&quot; after sending</li>
            </ol>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300! text-gray-700! mb-1">
              Deposit Amount (USDT)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                className="w-full h-10 pl-4 pr-4 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-transparent bg-white text-sm text-gray-900! dark:text-white! focus:outline-none focus:ring-0 focus:border-(--brand-focus) [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter an amount"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="py-3 w-full font-semibold text-white from-indigo-600 to-purple-600 rounded-lg shadow-md transition bg-linear-to-r hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Creating a wallet address..."
              : "Generate Deposit Address"}
          </Button>
        </form>
      </div>
    </div>
  );
}

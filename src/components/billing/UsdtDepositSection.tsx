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
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold !text-gray-900 dark:!text-white">
          Cryptocurrency (USDT)
        </h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
            <span className="!text-red-700 dark:!text-white text-sm">
              {error}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <p className="!text-gray-600 dark:!text-white">
            Deposit USDT (Tether) to your account. Please ensure you are sending
            funds through the <span className="font-semibold">{network}</span>{" "}
            network.
          </p>
          {/* <Button
            onClick={onNetworkToggle}
            className="px-6 py-1 text-xs dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
          >
            Switch to {network === "TRC20" ? "ERC20" : "TRC20"}
          </Button> */}
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-4">
          <div className="flex items-start">
            <Info className="h-4 w-4 mt-0.5 mr-2 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <h4 className="font-medium !text-yellow-800 dark:!text-white text-sm">
                Important Notice
              </h4>
              <p className="!text-gray-900 dark:!text-white text-xs">
                {network === "TRC20"
                  ? "TRC20 deposits are faster and have lower fees "
                  : "ERC20 deposits may take longer and have higher gas fees (varies)"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleInstructions}
          className="text-sm text-purple-600 dark:text-purple-400 hover:underline mb-2 bg-transparent border-none p-0 cursor-pointer"
        >
          {showInstructions ? "Hide" : "Show"} deposit instructions
        </button>

        {showInstructions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 text-sm !text-gray-700 dark:!text-white mb-4">
            <h4 className="font-medium mb-2 !text-gray-900 dark:!text-white">Deposit Instructions:</h4>
            <ol className="list-decimal pl-5 space-y-1">
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
            <label className="block text-sm font-medium dark:!text-gray-300 !text-gray-700 mb-1">
              Deposit Amount (USDT)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                className="w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg dark:bg-white/5 bg-gray-50 !text-gray-900 dark:!text-white focus:outline-none focus:ring-1 focus:ring-purple-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="Enter an amount"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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

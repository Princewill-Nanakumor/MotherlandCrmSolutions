// src/components/billing/BillingManager.tsx

"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import BillingSidebar from "./BillingSidebar";
import UsdtDepositSection from "./UsdtDepositSection";
import CardDepositSection from "./CardDepositSection";
import PaymentDetailsModal from "./PaymentDetailsModal";
import BillingHeader from "./BillingHeader";
import PaymentStorageManager from "./PaymentStorageManager";
import { useBillingSummary } from "@/hooks/useBillingData";
import { useCreatePayment } from "@/hooks/usePaymentMutations";
import { Payment } from "@/types/payment.types";
import { getClientPaymentLimits } from "@/lib/paymentLimits";

const { minAmount: MIN_DEPOSIT, maxAmount: MAX_DEPOSIT } =
  getClientPaymentLimits();

export default function BillingManager() {
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState("usdt");
  const [showInstructions, setShowInstructions] = useState(false);
  const [network, setNetwork] = useState<"TRC20" | "ERC20">("TRC20");
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string>("");
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // React Query hooks
  const {
    billingData,
    isLoading: isBillingLoading,
    refetch: refetchBillingData,
  } = useBillingSummary();
  const createPaymentMutation = useCreatePayment();

  // Payment storage manager - memoized to prevent recreating on every render
  const paymentStorageManager = useMemo(
    () =>
      PaymentStorageManager({
        currentPayment,
        network,
        setCurrentPayment,
        setNetwork,
        setPaymentConfirmed,
      }),
    [currentPayment, network],
  );

  // Load persisted payment on component mount (network + payment survive refresh)
  useEffect(() => {
    const result = paymentStorageManager.loadPaymentFromStorage();
    if (result.expiredUnconfirmed && result.paymentId) {
      void (async () => {
        try {
          await fetch(`/api/payments/${result.paymentId}/expire`, {
            method: "POST",
            credentials: "include",
          });
          await refetchBillingData();
        } catch (error) {
          console.error("Failed to expire restored payment:", error);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save payment + network to localStorage when it changes
  useEffect(() => {
    if (currentPayment) {
      paymentStorageManager.savePaymentToStorage(paymentConfirmed);
    }
  }, [currentPayment, network, paymentConfirmed, paymentStorageManager]);

  const handlePaymentExpired = useCallback(
    async (payment: Payment) => {
      setCurrentPayment({ ...payment, status: "FAILED" });
      setPaymentConfirmed(false);
      paymentStorageManager.clearPaymentFromStorage();
      await refetchBillingData();
    },
    [paymentStorageManager, refetchBillingData],
  );

  // Handle payment creation
  const handleCreatePayment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const amountNum = Number(amount);

      // M2: reject NaN / Infinity / negative explicitly so the client doesn't
      // silently fall through (NaN comparisons are always false).
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        setError("Please enter a valid deposit amount.");
        return;
      }
      if (amountNum < MIN_DEPOSIT) {
        setError(`Minimum deposit amount is ${MIN_DEPOSIT} USDT`);
        return;
      }
      if (amountNum > MAX_DEPOSIT) {
        setError(`Maximum deposit amount is ${MAX_DEPOSIT} USDT`);
        return;
      }

      try {
        const result = await createPaymentMutation.mutateAsync({
          amount: amountNum,
          currency: "USD",
          method: "CRYPTO",
          network: network,
          description: `${amount} USDT deposit via ${network}`,
        });

        if (result.success) {
          setCurrentPayment(result.payment);
          setPaymentConfirmed(false);
          setAmount("");
          // Refetch billing data immediately to show new transaction
          await refetchBillingData();
        }
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to create payment",
        );
      }
    },
    [amount, network, createPaymentMutation, refetchBillingData],
  );

  const toggleNetwork = useCallback(() => {
    setNetwork(network === "TRC20" ? "ERC20" : "TRC20");
  }, [network]);

  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
  }, []);

  const handleToggleInstructions = useCallback(() => {
    setShowInstructions(!showInstructions);
  }, [showInstructions]);

  const handleSwitchToUsdt = useCallback(() => {
    setActiveTab("usdt");
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Payment action handlers
  const handleConfirmPayment = useCallback(() => {
    setPaymentConfirmed(true);
    paymentStorageManager.savePaymentToStorage(true);
  }, [paymentStorageManager]);

  const handleShowPaymentDetails = useCallback(() => {
    if (currentPayment) {
      setCurrentPaymentId(currentPayment._id);
      setShowPaymentModal(true);
    }
  }, [currentPayment]);

  const handleBackToDeposit = useCallback(() => {
    setCurrentPayment(null);
    setPaymentConfirmed(false);
    setAmount("");
    setError(null);
    paymentStorageManager.clearPaymentFromStorage();
  }, [paymentStorageManager]);

  const handleCloseModal = useCallback(() => {
    setShowPaymentModal(false);
    setCurrentPaymentId("");
  }, []);

  const handleTransactionClick = useCallback(
    (transactionId: string) => {
      // Don't open modal if there's an unconfirmed payment
      if (currentPayment && !paymentConfirmed) {
        return;
      }

      setCurrentPaymentId(transactionId);
      setShowPaymentModal(true);
    },
    [currentPayment, paymentConfirmed],
  );

  const handleClearPayment = useCallback(() => {
    setCurrentPayment(null);
    setPaymentConfirmed(false);
    setAmount("");
    setError(null);
    setShowPaymentModal(false);
    setCurrentPaymentId("");
    paymentStorageManager.clearPaymentFromStorage();
  }, [paymentStorageManager]);

  const handleNewPayment = useCallback(() => {
    handleClearPayment();
    setActiveTab("usdt");
    setNetwork("TRC20");
    setShowInstructions(false);
  }, [handleClearPayment]);

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 py-6 border rounded-lg">
        {/* Header */}
        <BillingHeader />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            <div className="p-6 bg-white border border-gray-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
              {/* Tab Navigation */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900! dark:text-white!">
                  Deposit Funds
                </h2>
                <div className="flex space-x-1">
                  <Button
                    onClick={() => handleTabChange("usdt")}
                    className={`px-4 py-2 mr-4 rounded-lg text-sm font-medium ${
                      activeTab === "usdt"
                        ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white"
                        : "dark:bg-transparent dark:hover:bg-white/10 dark:border dark:border-white/20 dark:text-white bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300"
                    }`}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Crypto
                  </Button>
                  <Button
                    onClick={() => handleTabChange("card")}
                    variant="outline"
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Card Deposit
                  </Button>
                </div>
              </div>

              {/* USDT Deposit Section */}
              {activeTab === "usdt" ? (
                <UsdtDepositSection
                  network={network}
                  amount={amount}
                  isSubmitting={createPaymentMutation.isPending}
                  error={error}
                  currentPayment={currentPayment}
                  paymentConfirmed={paymentConfirmed}
                  showInstructions={showInstructions}
                  onNetworkToggle={toggleNetwork}
                  onAmountChange={handleAmountChange}
                  onCreatePayment={handleCreatePayment}
                  onConfirmPayment={handleConfirmPayment}
                  onShowPaymentDetails={handleShowPaymentDetails}
                  onToggleInstructions={handleToggleInstructions}
                  onBackToDeposit={handleBackToDeposit}
                  onPaymentExpired={handlePaymentExpired}
                />
              ) : (
                <CardDepositSection onSwitchToUsdt={handleSwitchToUsdt} />
              )}
            </div>
          </div>

          {/* Right Column - Billing Sidebar */}
          <BillingSidebar
            balance={billingData.balance}
            totalDeposits={billingData.totalDeposits}
            pendingAmount={billingData.pendingAmount}
            recentTransactions={billingData.recentTransactions}
            onTransactionClick={handleTransactionClick}
            isLoading={isBillingLoading}
            hasUnconfirmedPayment={!!(currentPayment && !paymentConfirmed)}
          />
        </div>
      </div>

      {/* Payment Details Modal */}
      <PaymentDetailsModal
        paymentId={currentPaymentId}
        isOpen={showPaymentModal}
        onClose={handleCloseModal}
        onNewPayment={handleNewPayment}
        onClearPayment={handleClearPayment}
      />
    </div>
  );
}

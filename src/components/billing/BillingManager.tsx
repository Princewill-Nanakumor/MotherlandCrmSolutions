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
import PaymentStorageManager, {
  clearNotificationLockForPayment,
  clearPaymentStorage,
} from "./PaymentStorageManager";
import { useBillingSummary } from "@/hooks/useBillingData";
import { useCreatePayment } from "@/hooks/usePaymentMutations";
import { Payment } from "@/types/payment.types";
import { getClientPaymentLimits } from "@/lib/paymentLimits";
import { DASHBOARD_PAGE_SHELL_CLASS } from "@/lib/dashboardPageShell";

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
    payments,
    isLoading: isBillingLoading,
    refetch: refetchBillingData,
  } = useBillingSummary();
  const createPaymentMutation = useCreatePayment();

  // When a deposit is approved/rejected, drop the "confirmation submitted" panel
  // so Deposit Funds returns to the create-deposit form.
  useEffect(() => {
    if (!currentPayment?._id || payments.length === 0) return;
    const fresh = payments.find(
      (p) => String(p._id) === String(currentPayment._id),
    );
    if (!fresh) return;
    if (fresh.status !== "COMPLETED" && fresh.status !== "FAILED") return;

    setCurrentPayment(null);
    setPaymentConfirmed(false);
    setAmount("");
    setError(null);
    clearPaymentStorage();
    clearNotificationLockForPayment(String(currentPayment._id));
  }, [payments, currentPayment]);

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
    <div className={DASHBOARD_PAGE_SHELL_CLASS}>
      <BillingHeader />

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <div className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6 dark:border dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-lg">
            <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="shrink-0 text-xl font-semibold text-gray-900! dark:text-white!">
                Deposit Funds
              </h2>
              <div className="flex w-full min-w-0 gap-2 sm:w-auto">
                <Button
                  onClick={() => handleTabChange("usdt")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none sm:px-4 ${
                    activeTab === "usdt"
                      ? "bg-linear-to-r from-indigo-600 to-purple-600 text-white"
                      : "border border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:border dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                  }`}
                >
                  <Wallet className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
                  <span className="truncate">Crypto</span>
                </Button>
                <Button
                  onClick={() => handleTabChange("card")}
                  variant="outline"
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium sm:flex-none sm:px-4 ${
                    activeTab === "card"
                      ? "border-transparent bg-linear-to-r from-indigo-600 to-purple-600 text-white"
                      : ""
                  }`}
                >
                  <CreditCard className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2" />
                  <span className="truncate">Card Deposit</span>
                </Button>
              </div>
            </div>

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

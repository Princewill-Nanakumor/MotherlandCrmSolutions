// src/hooks/usePaymentActions.ts

"use client";

import { useCallback } from "react";

interface CurrentPayment {
  _id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: "CREDIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "CRYPTO";
  transactionId: string;
  description?: string;
  network?: "TRC20" | "ERC20";
  walletAddress?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface PaymentStorageManagerType {
  loadPaymentFromStorage: () => void;
  savePaymentToStorage: (confirmed?: boolean) => void;
  clearPaymentFromStorage: () => void;
}

interface BillingDataManagerType {
  fetchBillingData: () => Promise<void>;
}

interface UsePaymentActionsProps {
  currentPayment: CurrentPayment | null;
  paymentStorageRef: React.MutableRefObject<PaymentStorageManagerType | null>;
  billingDataManagerRef: React.MutableRefObject<BillingDataManagerType | null>;
  setPaymentConfirmed: (confirmed: boolean) => void;
  setCurrentPaymentId: (id: string) => void;
  setShowPaymentModal: (show: boolean) => void;
  setCurrentPayment: (payment: CurrentPayment | null) => void;
  setAmount: (amount: string) => void;
  setError: (error: string | null) => void;
}

export function usePaymentActions({
  currentPayment,
  paymentStorageRef,
  billingDataManagerRef,
  setPaymentConfirmed,
  setCurrentPaymentId,
  setShowPaymentModal,
  setCurrentPayment,
  setAmount,
  setError,
}: UsePaymentActionsProps) {
  const handleConfirmPayment = useCallback(async () => {
    if (!currentPayment) return;

    try {
      setPaymentConfirmed(true);
      if (paymentStorageRef.current) {
        paymentStorageRef.current.savePaymentToStorage(true);
      }

      // Here you would typically verify the payment on the blockchain
      // For now, we'll simulate the verification
      const response = await fetch(
        `/api/payments/${currentPayment._id}/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (response.ok && billingDataManagerRef.current) {
        billingDataManagerRef.current.fetchBillingData();
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
  }, [
    currentPayment,
    paymentStorageRef,
    billingDataManagerRef,
    setPaymentConfirmed,
  ]);

  const handleShowPaymentDetails = useCallback(() => {
    if (currentPayment) {
      setCurrentPaymentId(currentPayment._id);
      setShowPaymentModal(true);
    }
  }, [currentPayment, setCurrentPaymentId, setShowPaymentModal]);

  const handleBackToDeposit = useCallback(() => {
    if (paymentStorageRef.current) {
      paymentStorageRef.current.clearPaymentFromStorage();
    }
    setCurrentPayment(null);
    setPaymentConfirmed(false);
    setAmount("");
    setError(null);
  }, [
    paymentStorageRef,
    setCurrentPayment,
    setPaymentConfirmed,
    setAmount,
    setError,
  ]);

  const handleCloseModal = useCallback(() => {
    setShowPaymentModal(false);
    setCurrentPaymentId("");
    setCurrentPayment(null);
  }, [setShowPaymentModal, setCurrentPaymentId, setCurrentPayment]);

  const handleTransactionClick = useCallback(
    (transactionId: string) => {
      setCurrentPaymentId(transactionId);
      setShowPaymentModal(true);
    },
    [setCurrentPaymentId, setShowPaymentModal]
  );

  return {
    handleConfirmPayment,
    handleShowPaymentDetails,
    handleBackToDeposit,
    handleCloseModal,
    handleTransactionClick,
  };
}

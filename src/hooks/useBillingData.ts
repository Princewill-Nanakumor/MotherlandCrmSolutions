// src/hooks/useBillingData.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Payment, PaymentsResponse, BillingData } from "@/types/payment.types";

interface UserProfile {
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    balance: number;
    role: string;
  };
}

// Query keys for billing
export const billingKeys = {
  all: ["billing"] as const,
  payments: (limit?: number) => ["billing", "payments", { limit }] as const,
  payment: (id: string) => ["billing", "payment", id] as const,
  balance: () => ["billing", "balance"] as const,
  summary: () => ["billing", "summary"] as const,
};

/**
 * Fetch payments with pagination
 */
export const usePayments = (limit: number = 10) => {
  const { status } = useSession();

  return useQuery({
    queryKey: billingKeys.payments(limit),
    queryFn: async (): Promise<PaymentsResponse> => {
      const response = await fetch(`/api/payments?limit=${limit}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      return response.json();
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    enabled: status === "authenticated",
  });
};

/**
 * Fetch user balance
 */
export const useUserBalance = () => {
  const { status } = useSession();

  return useQuery({
    queryKey: billingKeys.balance(),
    queryFn: async (): Promise<number> => {
      const response = await fetch("/api/user/profile", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user balance");
      }

      const data: UserProfile = await response.json();
      return data.user?.balance || 0;
    },
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    enabled: status === "authenticated",
  });
};

/**
 * Fetch specific payment by ID
 */
export const usePayment = (paymentId: string | null) => {
  const { status } = useSession();

  return useQuery<Payment, Error>({
    queryKey: billingKeys.payment(paymentId || ""),
    queryFn: async (): Promise<Payment> => {
      if (!paymentId) {
        throw new Error("Payment ID is required");
      }

      const response = await fetch(`/api/payments/${paymentId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch payment");
      }

      const data = await response.json();

      // The API returns { success, payment }, so normalize to Payment
      if (data && data.payment) {
        return data.payment as Payment;
      }

      // Fallback in case the API shape changes
      return data as Payment;
    },
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: status === "authenticated" && !!paymentId,
  });
};

/**
 * Combined hook for billing summary data
 */
export const useBillingSummary = () => {
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    error: paymentsError,
    refetch: refetchPayments,
  } = usePayments(10);
  const {
    data: balance,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useUserBalance();

  // Calculate summary data
  const billingData: BillingData = {
    balance: balance || 0,
    totalDeposits: 0,
    pendingAmount: 0,
    recentTransactions: [],
  };

  if (paymentsData?.payments) {
    const completedPayments = paymentsData.payments.filter(
      (payment) => payment.status === "COMPLETED"
    );
    const pendingPayments = paymentsData.payments.filter(
      (payment) => payment.status === "PENDING"
    );

    billingData.totalDeposits = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    billingData.pendingAmount = pendingPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    billingData.recentTransactions = paymentsData.payments.map((payment) => ({
      id: payment._id,
      amount: payment.amount,
      status: payment.status,
      date: payment.createdAt,
      type: payment.method === "CRYPTO" ? "USDT Deposit" : "Card Deposit",
    }));
  }

  return {
    billingData,
    isLoading: isLoadingPayments || isLoadingBalance,
    error: paymentsError || balanceError,
    refetch: async () => {
      await Promise.all([refetchPayments(), refetchBalance()]);
    },
  };
};

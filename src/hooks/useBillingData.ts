// src/hooks/useBillingData.ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { Payment, PaymentsResponse, BillingData } from "@/types/payment.types";
import { notificationKeys } from "@/lib/notificationKeys";
import {
  clearNotificationLockForPayment,
  clearPaymentStorage,
} from "@/components/billing/PaymentStorageManager";

/** Read `{ error }` first (server convention), then `message`, then a fallback. */
async function extractApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return body.error ?? body.message ?? fallback;
}

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
  /** Prefix for all payment-list queries. Use with exact:false to match any limit. */
  paymentsRoot: () => ["billing", "payments"] as const,
  payments: (limit?: number) =>
    limit === undefined
      ? (["billing", "payments"] as const)
      : (["billing", "payments", { limit }] as const),
  payment: (id: string) => ["billing", "payment", id] as const,
  balance: () => ["billing", "balance"] as const,
  summary: () => ["billing", "summary"] as const,
};

/**
 * Fetch payments with pagination
 */
export const usePayments = (limit: number = 10) => {
  const { status, data: session } = useSession();

  return useQuery<PaymentsResponse, Error>({
    queryKey: billingKeys.payments(limit),
    queryFn: async (): Promise<PaymentsResponse> => {
      const response = await apiCallWithSessionRefresh(
        `/api/payments?limit=${limit}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          await extractApiError(response, "Failed to fetch payments"),
        );
      }

      return response.json() as Promise<PaymentsResponse>;
    },
    staleTime: 15 * 1000, // 15 seconds — status can change when approved elsewhere
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: (query) => {
      const hasPending = query.state.data?.payments?.some(
        (payment) => payment.status === "PENDING",
      );
      return hasPending ? 10_000 : false;
    },
    retry: 2,
    enabled:
      hasAuthorizedSession(status, session) && session?.user?.role === "ADMIN",
  });
};

/**
 * Fetch user balance
 */
export const useUserBalance = () => {
  const { status, data: session } = useSession();

  return useQuery<number, Error>({
    queryKey: billingKeys.balance(),
    queryFn: async (): Promise<number> => {
      const response = await apiCallWithSessionRefresh("/api/user/profile", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await extractApiError(response, "Failed to fetch user balance"),
        );
      }

      const data: UserProfile = await response.json();
      return data.user?.balance || 0;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    enabled:
      hasAuthorizedSession(status, session) && session?.user?.role === "ADMIN",
  });
};

/**
 * Fetch specific payment by ID
 */
export const usePayment = (paymentId: string | null) => {
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();

  return useQuery<Payment, Error>({
    queryKey: billingKeys.payment(paymentId || ""),
    queryFn: async (): Promise<Payment> => {
      if (!paymentId) {
        throw new Error("Payment ID is required");
      }

      const response = await apiCallWithSessionRefresh(
        `/api/payments/${paymentId}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          await extractApiError(response, "Failed to fetch payment"),
        );
      }

      const data = await response.json();

      // The API returns { success, payment }, so normalize to Payment
      const payment = (
        data && data.payment ? data.payment : data
      ) as Payment;
      const paymentIdStr = String(payment._id);

      // Keep Recent Transactions in sync when detail status changed
      // (e.g. approved by a super admin while this list was still PENDING).
      let statusChanged = false;
      queryClient.setQueriesData<PaymentsResponse>(
        { queryKey: billingKeys.paymentsRoot() },
        (old) => {
          if (!old?.payments?.length) return old;
          let changed = false;
          const payments = old.payments.map((item) => {
            if (String(item._id) !== paymentIdStr) return item;
            if (
              item.status === payment.status &&
              String(item.approvedAt ?? "") === String(payment.approvedAt ?? "")
            ) {
              return item;
            }
            changed = true;
            statusChanged = true;
            return { ...item, ...payment, _id: item._id };
          });
          return changed ? { ...old, payments } : old;
        },
      );

      // Only refresh balance/notifications when the list status actually changed.
      // Avoids thrashing the bell every time an already-completed payment is opened.
      if (
        statusChanged &&
        (payment.status === "COMPLETED" || payment.status === "FAILED")
      ) {
        void queryClient.invalidateQueries({
          queryKey: billingKeys.balance(),
        });
        void queryClient.invalidateQueries({
          queryKey: notificationKeys.all,
        });

        // Drop stale in-progress deposit UI if this was the stored payment
        if (typeof window !== "undefined") {
          try {
            const stored = window.localStorage.getItem("current_payment");
            if (stored) {
              const storedPayment = JSON.parse(stored) as { _id?: string };
              if (String(storedPayment._id) === paymentIdStr) {
                clearPaymentStorage();
                clearNotificationLockForPayment(paymentIdStr);
              }
            }
          } catch {
            // best effort
          }
        }
      }

      return payment;
    },
    staleTime: 0, // always fetch fresh status when opening details
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    enabled:
      hasAuthorizedSession(status, session) &&
      session?.user?.role === "ADMIN" &&
      !!paymentId,
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

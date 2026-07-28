// src/hooks/usePaymentMutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { billingKeys } from "./useBillingData";
import { notificationKeys } from "@/lib/notificationKeys";
import {
  Payment,
  CreatePaymentData,
  CreatePaymentResponse,
  PaymentsResponse,
} from "@/types/payment.types";

/**
 * Mutation hook for creating a payment
 */
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      paymentData: CreatePaymentData
    ): Promise<CreatePaymentResponse> => {
      const response = await apiCallWithSessionRefresh("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || "Failed to create payment",
        );
      }

      return response.json() as Promise<CreatePaymentResponse>;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: billingKeys.paymentsRoot() });

      // Snapshot the previous value
      const previousPayments = queryClient.getQueryData(
        billingKeys.payments(10)
      );

      // No optimistic update for payment creation (we need the server response with wallet address)

      return { previousPayments };
    },
    onSuccess: async (data) => {
      // Invalidate all payment-list queries (any limit)
      queryClient.invalidateQueries({
        queryKey: billingKeys.paymentsRoot(),
      });

      // Invalidate balance query
      queryClient.invalidateQueries({
        queryKey: billingKeys.balance(),
      });

      // Force immediate refetch of the payments query used by useBillingSummary (limit: 10)
      await queryClient.refetchQueries({
        queryKey: billingKeys.payments(10),
      });

      // Force immediate refetch of balance
      await queryClient.refetchQueries({
        queryKey: billingKeys.balance(),
      });

      toast({
        title: "Payment Created!",
        description: `Payment request for ${data.payment.amount} ${data.payment.currency} created successfully`,
        variant: "success",
      });
    },
    onError: (error: Error, _variables, context) => {
      // Rollback if needed
      if (context?.previousPayments) {
        queryClient.setQueryData(
          billingKeys.payments(10),
          context.previousPayments
        );
      }

      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create payment request",
        variant: "destructive",
      });
    },
  });
};

/**
 * Mutation hook for approving a payment (Super Admin only)
 */
export const useApprovePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentId: string): Promise<CreatePaymentResponse> => {
      const response = await apiCallWithSessionRefresh(
        `/api/payments/${paymentId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            "Failed to approve payment",
        );
      }

      return response.json() as Promise<CreatePaymentResponse>;
    },
    onMutate: async (paymentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: billingKeys.payment(paymentId),
      });
      await queryClient.cancelQueries({ queryKey: billingKeys.paymentsRoot() });

      // Snapshot the previous values
      const previousPayment = queryClient.getQueryData(
        billingKeys.payment(paymentId)
      );
      const previousPayments = queryClient.getQueryData(
        billingKeys.payments(10)
      );

      // Optimistically update the payment status
      queryClient.setQueryData<Payment>(
        billingKeys.payment(paymentId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            status: "COMPLETED",
            approvedAt: new Date().toISOString(),
          };
        }
      );

      // Keep Recent Transactions in sync immediately
      queryClient.setQueriesData<PaymentsResponse>(
        { queryKey: billingKeys.paymentsRoot() },
        (old) => {
          if (!old?.payments?.length) return old;
          return {
            ...old,
            payments: old.payments.map((item) =>
              String(item._id) === String(paymentId)
                ? {
                    ...item,
                    status: "COMPLETED",
                    approvedAt: new Date().toISOString(),
                  }
                : item,
            ),
          };
        },
      );

      return { previousPayment, previousPayments };
    },
    onSuccess: async (data) => {
      if (data.payment) {
        queryClient.setQueryData(billingKeys.payment(data.payment._id), data.payment);
        queryClient.setQueriesData<PaymentsResponse>(
          { queryKey: billingKeys.paymentsRoot() },
          (old) => {
            if (!old?.payments?.length) return old;
            return {
              ...old,
              payments: old.payments.map((item) =>
                String(item._id) === String(data.payment._id)
                  ? { ...item, ...data.payment, _id: item._id }
                  : item,
              ),
            };
          },
        );
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingKeys.paymentsRoot() }),
        queryClient.invalidateQueries({ queryKey: billingKeys.balance() }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.refetchQueries({ queryKey: billingKeys.payments(10) }),
        queryClient.refetchQueries({ queryKey: billingKeys.balance() }),
        queryClient.refetchQueries({ queryKey: notificationKeys.all }),
      ]);

      toast({
        title: "Payment Approved!",
        description: data.message || "Payment has been approved successfully",
        variant: "success",
      });
    },
    onError: (error: Error, paymentId, context) => {
      // Rollback optimistic updates
      if (context?.previousPayment) {
        queryClient.setQueryData(
          billingKeys.payment(paymentId),
          context.previousPayment
        );
      }

      if (context?.previousPayments) {
        queryClient.setQueryData(
          billingKeys.payments(10),
          context.previousPayments
        );
      }

      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve payment",
        variant: "destructive",
      });
    },
  });
};

/**
 * Mutation hook for rejecting a payment (Super Admin only)
 */
export const useRejectPayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentId: string): Promise<CreatePaymentResponse> => {
      const response = await apiCallWithSessionRefresh(
        `/api/payments/${paymentId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error ||
            "Failed to reject payment",
        );
      }

      return response.json() as Promise<CreatePaymentResponse>;
    },
    onMutate: async (paymentId) => {
      await queryClient.cancelQueries({
        queryKey: billingKeys.payment(paymentId),
      });
      await queryClient.cancelQueries({ queryKey: billingKeys.paymentsRoot() });

      const previousPayment = queryClient.getQueryData(
        billingKeys.payment(paymentId),
      );
      const previousPayments = queryClient.getQueryData(
        billingKeys.payments(10),
      );

      queryClient.setQueryData<Payment>(billingKeys.payment(paymentId), (old) => {
        if (!old) return old;
        return {
          ...old,
          status: "FAILED",
          approvedAt: new Date().toISOString(),
        };
      });

      queryClient.setQueriesData<PaymentsResponse>(
        { queryKey: billingKeys.paymentsRoot() },
        (old) => {
          if (!old?.payments?.length) return old;
          return {
            ...old,
            payments: old.payments.map((item) =>
              String(item._id) === String(paymentId)
                ? {
                    ...item,
                    status: "FAILED",
                    approvedAt: new Date().toISOString(),
                  }
                : item,
            ),
          };
        },
      );

      return { previousPayment, previousPayments };
    },
    onSuccess: async (data) => {
      if (data.payment) {
        queryClient.setQueryData(
          billingKeys.payment(data.payment._id),
          data.payment,
        );
        queryClient.setQueriesData<PaymentsResponse>(
          { queryKey: billingKeys.paymentsRoot() },
          (old) => {
            if (!old?.payments?.length) return old;
            return {
              ...old,
              payments: old.payments.map((item) =>
                String(item._id) === String(data.payment._id)
                  ? { ...item, ...data.payment, _id: item._id }
                  : item,
              ),
            };
          },
        );
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: billingKeys.paymentsRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: billingKeys.balance(),
        }),
        queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
        queryClient.refetchQueries({ queryKey: billingKeys.payments(10) }),
        queryClient.refetchQueries({ queryKey: notificationKeys.all }),
      ]);

      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected",
        variant: "success",
      });
    },
    onError: (error: Error, paymentId, context) => {
      if (context?.previousPayment) {
        queryClient.setQueryData(
          billingKeys.payment(paymentId),
          context.previousPayment,
        );
      }
      if (context?.previousPayments) {
        queryClient.setQueryData(
          billingKeys.payments(10),
          context.previousPayments,
        );
      }

      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject payment",
        variant: "destructive",
      });
    },
  });
};

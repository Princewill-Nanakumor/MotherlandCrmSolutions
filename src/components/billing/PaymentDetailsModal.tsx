// src/components/billing/PaymentDetailsModal.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentDetailsContent from "./PaymentDetailsContent";
import { usePayment } from "@/hooks/useBillingData";
import { clearPaymentStorage } from "./PaymentStorageManager";
import type { Payment } from "@/types/payment.types";

interface PaymentDetailsModalProps {
  paymentId: string;
  isOpen: boolean;
  onClose: () => void;
  onNewPayment?: () => void;
  onViewAllPayments?: () => void;
  onClearPayment?: () => void;
}

function PaymentDetailsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-6 min-h-112 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading payment details"
    >
      {/* Main column — mirrors Account + Payment Information */}
      <div className="space-y-6 lg:col-span-2">
        <div className="p-6 rounded-xl border border-gray-200 shadow-xl bg-white/70 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex gap-2 items-center mb-4">
            <Skeleton className="w-5 h-5 bg-gray-200 rounded dark:bg-gray-700" />
            <Skeleton className="w-24 h-5 bg-gray-200 dark:bg-gray-700" />
          </div>
          <Skeleton className="mb-2 w-40 h-4 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="w-56 h-4 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex gap-2 items-center mb-6">
            <Skeleton className="w-5 h-5 bg-gray-200 rounded dark:bg-gray-700" />
            <Skeleton className="w-44 h-5 bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 justify-between items-center">
                <Skeleton className="w-20 h-4 bg-gray-200 dark:bg-gray-700" />
                <Skeleton
                  className={`h-5 bg-gray-200 dark:bg-gray-700 ${
                    i === 0 ? "w-28" : i === 1 || i === 2 ? "w-24" : "w-36"
                  }`}
                />
              </div>
            ))}
            <div className="pt-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
              <Skeleton className="w-24 h-4 bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="w-full max-w-md h-4 bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar — mirrors Status + Quick Actions */}
      <div className="space-y-6">
        <div className="p-6 rounded-xl border border-gray-200 shadow-xl bg-white/70 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton className="mb-4 w-20 h-5 bg-gray-200 dark:bg-gray-700" />
          <div className="flex gap-2 items-center">
            <Skeleton className="w-5 h-5 bg-gray-200 rounded-full dark:bg-gray-700" />
            <Skeleton className="w-24 h-4 bg-gray-200 dark:bg-gray-700" />
          </div>
          <Skeleton className="mt-3 w-40 h-3 bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="p-6 rounded-xl border border-gray-200 shadow-xl bg-white/70 dark:border-gray-700 dark:bg-gray-800">
          <Skeleton className="mb-4 w-32 h-5 bg-gray-200 dark:bg-gray-700" />
          <Skeleton className="w-full h-10 bg-gray-200 rounded-md dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

export default function PaymentDetailsModal({
  paymentId,
  isOpen,
  onClose,
  onNewPayment = () => {},
  onClearPayment = () => {},
}: PaymentDetailsModalProps) {
  const {
    data: payment,
    isLoading: loading,
    error,
  } = usePayment(isOpen ? paymentId : null);

  const handleClose = () => {
    clearPaymentStorage();
    onClearPayment();
    onClose();
  };

  const typedPayment = payment as Payment | undefined;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="flex w-full max-h-[90vh] flex-col overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-bold text-gray-900! dark:text-gray-50!">
            Payment Details
          </DialogTitle>
          {typedPayment?.transactionId ? (
            <p className="text-sm text-gray-600! dark:text-gray-300!">
              Transaction ID: {typedPayment.transactionId}
            </p>
          ) : loading ? (
            <Skeleton className="mt-1 w-64 h-4 bg-gray-200 dark:bg-gray-700" />
          ) : null}
        </DialogHeader>

        <div className="w-full min-h-112">
          {loading ? (
            <PaymentDetailsSkeleton />
          ) : error ? (
            <div className="flex flex-col justify-center items-center py-8 text-center min-h-112">
              <p className="mb-4 text-red-600 dark:text-red-400">
                {error instanceof Error
                  ? error.message
                  : "Failed to fetch payment details"}
              </p>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          ) : typedPayment ? (
            <PaymentDetailsContent
              payment={typedPayment}
              onNewPayment={onNewPayment}
              onClose={handleClose}
            />
          ) : (
            <div className="flex justify-center items-center py-8 text-center min-h-112">
              <p className="text-gray-600! dark:text-gray-300!">
                No payment details available
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

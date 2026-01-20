"use client";

import React from "react";
import { X as CloseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentDetailsContent from "./PaymentDetailsContent";
import { usePayment } from "@/hooks/useBillingData";

interface PaymentDetailsModalProps {
  paymentId: string;
  isOpen: boolean;
  onClose: () => void;
  onNewPayment?: () => void;
  onViewAllPayments?: () => void;
  onClearPayment?: () => void;
}

export default function PaymentDetailsModal({
  paymentId,
  isOpen,
  onClose,
  onNewPayment = () => {},
  onClearPayment = () => {},
}: PaymentDetailsModalProps) {
  // Use React Query to fetch payment details
  const {
    data: payment,
    isLoading: loading,
    error,
  } = usePayment(isOpen ? paymentId : null);

  const handleClose = () => {
    // Clear localStorage
    localStorage.removeItem("currentPayment");
    localStorage.removeItem("paymentNetwork");
    localStorage.removeItem("paymentConfirmed");

    // Call the parent handlers
    onClearPayment();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold !text-gray-900 dark:!text-white">
              Payment Details
            </h2>
            {payment && (
              <p className="!text-gray-600 dark:!text-white text-sm">
                Transaction ID:{" "}
                {
                  (
                    payment as unknown as import("@/types/payment.types").Payment
                  ).transactionId
                }
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <CloseIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-b-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 rounded-full border-b-2 border-gray-900 dark:border-white animate-spin"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400 mb-4">
                {error instanceof Error
                  ? error.message
                  : "Failed to fetch payment details"}
              </p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          ) : payment ? (
            <PaymentDetailsContent
              payment={
                payment as unknown as import("@/types/payment.types").Payment
              }
              onNewPayment={onNewPayment}
              onClose={handleClose}
            />
          ) : (
            <div className="text-center py-8">
              <p className="!text-gray-600 dark:!text-white">
                No payment details available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

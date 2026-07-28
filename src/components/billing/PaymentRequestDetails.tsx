// src/components/billing/PaymentRequestDetails.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Info,
  CheckCircle,
  ArrowLeft,
  Clock,
  AlertTriangle,
} from "lucide-react";
import QRCode from "react-qr-code";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Payment } from "@/types/payment.types";
import { notificationKeys } from "@/lib/notificationKeys";
import { billingKeys } from "@/hooks/useBillingData";
import {
  formatCountdown,
  resolvePaymentExpiresAt,
} from "@/lib/paymentConfirmWindow";
import {
  clearNotificationLockForPayment,
  clearPaymentStorage,
} from "./PaymentStorageManager";

interface PaymentRequestDetailsProps {
  currentPayment: Payment;
  network: "TRC20" | "ERC20";
  paymentConfirmed: boolean;
  onConfirmPayment: () => void;
  onShowPaymentDetails: () => void;
  onBackToDeposit: () => void;
  onPaymentExpired?: (payment: Payment) => void;
}

export default function PaymentRequestDetails({
  currentPayment,
  network,
  paymentConfirmed,
  onConfirmPayment,
  onShowPaymentDetails,
  onBackToDeposit,
  onPaymentExpired,
}: PaymentRequestDetailsProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isExpiring, setIsExpiring] = useState(false);
  const [expiredLocally, setExpiredLocally] = useState(
    currentPayment.status === "FAILED",
  );
  const processingRef = useRef(false);
  const expireStartedRef = useRef(false);

  const expiresAt = useMemo(
    () => resolvePaymentExpiresAt(currentPayment),
    [currentPayment],
  );

  const msRemaining = expiresAt ? Math.max(0, expiresAt.getTime() - nowMs) : 0;
  const isWindowActive =
    !paymentConfirmed &&
    !currentPayment.userConfirmedAt &&
    !expiredLocally &&
    currentPayment.status === "PENDING" &&
    msRemaining > 0;

  useEffect(() => {
    if (paymentConfirmed || currentPayment.userConfirmedAt || expiredLocally) {
      return;
    }
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paymentConfirmed, currentPayment.userConfirmedAt, expiredLocally]);

  const expirePayment = useCallback(async () => {
    if (
      expireStartedRef.current ||
      paymentConfirmed ||
      currentPayment.userConfirmedAt
    ) {
      return;
    }
    expireStartedRef.current = true;
    setIsExpiring(true);

    try {
      const response = await fetch(
        `/api/payments/${currentPayment._id}/expire`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await response.json().catch(() => ({}));
      const failedPayment =
        (data.payment as Payment | undefined) ??
        ({ ...currentPayment, status: "FAILED" } as Payment);

      setExpiredLocally(true);
      clearPaymentStorage();
      clearNotificationLockForPayment(currentPayment._id);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingKeys.paymentsRoot() }),
        queryClient.refetchQueries({ queryKey: billingKeys.payments(10) }),
      ]);

      onPaymentExpired?.(failedPayment);
    } catch (error) {
      console.error("Failed to expire payment:", error);
      expireStartedRef.current = false;
    } finally {
      setIsExpiring(false);
    }
  }, [currentPayment, onPaymentExpired, paymentConfirmed, queryClient]);

  useEffect(() => {
    if (
      !paymentConfirmed &&
      !currentPayment.userConfirmedAt &&
      currentPayment.status === "PENDING" &&
      expiresAt &&
      msRemaining <= 0 &&
      !expireStartedRef.current
    ) {
      void expirePayment();
    }
  }, [
    currentPayment.status,
    currentPayment.userConfirmedAt,
    expiresAt,
    expirePayment,
    msRemaining,
    paymentConfirmed,
  ]);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleBackToDeposit = () => {
    clearPaymentStorage();
    clearNotificationLockForPayment(currentPayment._id);
    onBackToDeposit();
  };

  const handleConfirmPayment = async () => {
    const notificationKey = `notification_sent_${currentPayment._id}`;

    if (processingRef.current || isSubmitting || notificationSent) return;
    if (!isWindowActive) {
      void expirePayment();
      return;
    }

    const alreadySent = localStorage.getItem(notificationKey);
    if (alreadySent === "true") {
      onConfirmPayment();
      return;
    }

    try {
      processingRef.current = true;
      setIsSubmitting(true);
      setNotificationSent(true);
      localStorage.setItem(notificationKey, "true");

      const notificationResponse = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          paymentId: currentPayment._id,
        }),
      });

      if (!notificationResponse.ok) {
        const errorData = await notificationResponse.json().catch(() => ({}));
        if (
          notificationResponse.status === 410 ||
          (errorData as { code?: string }).code === "PAYMENT_EXPIRED"
        ) {
          setExpiredLocally(true);
          clearPaymentStorage();
          clearNotificationLockForPayment(currentPayment._id);
          onPaymentExpired?.({ ...currentPayment, status: "FAILED" });
          return;
        }
        throw new Error(
          (errorData as { error?: string }).error ||
            "Failed to create notification",
        );
      }

      await queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
      });
      onConfirmPayment();
    } catch (error) {
      localStorage.removeItem(notificationKey);
      setNotificationSent(false);
      console.error("Error creating notification:", error);
    } finally {
      setIsSubmitting(false);
      processingRef.current = false;
    }
  };

  if (expiredLocally || currentPayment.status === "FAILED") {
    return (
      <div className="space-y-6">
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 mr-3 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-800! dark:text-red-300!">
              Deposit Request Expired
            </h3>
          </div>
          <p className="mb-4 text-sm text-red-700! dark:text-red-200!">
            You did not confirm this deposit within 1 hour. The payment request
            has been marked as failed. Please create a new deposit if you still
            want to add funds.
          </p>
          <Button onClick={handleBackToDeposit} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deposit
          </Button>
        </div>
      </div>
    );
  }

  if (paymentConfirmed) {
    return (
      <div className="space-y-6">
        <div className="p-6 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700">
          <div className="flex items-center mb-4">
            <Clock className="w-6 h-6 mr-3 text-blue-600" />
            <h3 className="font-semibold text-blue-800! dark:text-white! text-lg">
              Payment Confirmation Submitted
            </h3>
          </div>

          <div className="mb-6 space-y-3">
            <p className="text-blue-700! dark:text-white!">
              Thanks for letting us know — our team has been notified and will
              review your transaction shortly. You&apos;ll receive a
              confirmation when funds are credited to your balance.
            </p>

            <div className="p-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500! dark:text-white!">
                    Payment ID:
                  </span>
                  <p className="font-mono text-gray-900! dark:text-white!">
                    {currentPayment.transactionId}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500! dark:text-white!">
                    Amount:
                  </span>
                  <p className="font-semibold text-gray-900! dark:text-white!">
                    {currentPayment.amount} USDT
                  </p>
                </div>
                <div>
                  <span className="text-gray-500! dark:text-white!">
                    Network:
                  </span>
                  <p className="text-gray-900! dark:text-white!">{network}</p>
                </div>
                <div>
                  <span className="text-gray-500! dark:text-white!">
                    Status:
                  </span>
                  <p className="text-yellow-600! dark:text-yellow-400! font-medium flex gap-1">
                    <Clock className="h-5 w-5 text-yellow-600! dark:text-yellow-400! animate-spin" />
                    PENDING
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-start">
                <Info className="h-4 w-4 mt-0.5 mr-2 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800! dark:text-white! text-sm">
                    What happens next?
                  </h4>
                  <ul className="text-yellow-700 dark:text-white! text-xs mt-1 space-y-1">
                    <li>• Our team reviews and approves the transaction</li>
                    <li>
                      • Typical processing time:{" "}
                      {network === "TRC20"
                        ? "a few minutes once received"
                        : "5–10 minutes after the transaction confirms"}
                    </li>
                    <li>
                      • You&apos;ll receive a notification when your deposit has
                      been confirmed
                    </li>
                    <li>• Funds will be available on your account balance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={onShowPaymentDetails} className="flex-1">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Payment Details
            </Button>

            <Button
              onClick={handleBackToDeposit}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Deposit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const countdownUrgent = msRemaining > 0 && msRemaining < 5 * 60 * 1000;

  return (
    <div className="space-y-6">
      <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-700">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            <h3 className="font-semibold text-green-800! dark:text-white!">
              Payment Request Created
            </h3>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold tabular-nums ${
              countdownUrgent
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-white text-gray-900 dark:bg-gray-800 dark:text-white"
            }`}
            aria-live="polite"
          >
            <Clock className="w-4 h-4" />
            {isExpiring ? "Expiring…" : formatCountdown(msRemaining)}
          </div>
        </div>

        <p className="text-gray-900! dark:text-white! text-sm mb-4">
          Please send exactly{" "}
          <span className="font-bold text-gray-900! dark:text-white!">
            {currentPayment.amount} USDT
          </span>{" "}
          to the wallet address below. You have{" "}
          <span className="font-semibold">1 hour</span> to click{" "}
          <span className="font-semibold">
            &quot;I Have Made the Payment&quot;
          </span>
        </p>

        {currentPayment.walletAddress ? (
          <>
            <div className="p-4 mb-4 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700! dark:text-white!">
                  {network} Deposit Address
                </span>
                <Button
                  onClick={() => handleCopy(currentPayment.walletAddress!)}
                  className="flex items-center p-0 text-sm text-purple-600 bg-transparent hover:bg-gray-200 hover:dark:bg-gray-800 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="p-3 bg-white border border-gray-200 rounded-lg">
                  <QRCode
                    value={currentPayment.walletAddress}
                    size={128}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="Q"
                  />
                </div>

                <div className="flex-1 w-full">
                  <div className="font-mono text-sm dark:bg-white/5 bg-gray-100 px-4 py-3 rounded-lg break-all text-gray-900! dark:text-white!">
                    {currentPayment.walletAddress}
                  </div>

                  <div className="mt-3 flex items-center text-xs text-gray-500! dark:text-white!">
                    <Info className="w-4 h-4 mr-1" />
                    <span>
                      {network === "TRC20"
                        ? "Only send TRC20 USDT to this address (Tron network)"
                        : "Only send ERC20 USDT to this address (Ethereum network)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-start">
                <Info className="h-4 w-4 mt-0.5 mr-2 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800! text-sm">
                    Important Notice
                  </h4>
                  <p className="text-gray-900! dark:text-white! text-xs">
                    {network === "TRC20"
                      ? "TRC20 deposits are faster and have lower fees (~1 USDT) compared to ERC20."
                      : "ERC20 deposits may take longer and have higher gas fees (varies)."}
                  </p>
                  <p className="text-gray-900! dark:text-white! text-xs mt-1">
                    Confirm within 1 hour or this request will fail
                    automatically. Avoid creating a second deposit while this
                    one is active.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start">
              <Info className="h-4 w-4 mt-0.5 mr-2 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800! dark:text-white! text-sm">
                  Payment Created Successfully
                </h4>
                <p className="text-blue-700! dark:text-white! text-xs">
                  Payment ID: {currentPayment.transactionId}
                </p>
                <p className="text-blue-700! dark:text-white! text-xs">
                  Amount: {currentPayment.amount} {currentPayment.currency}
                </p>
                <p className="text-blue-700! dark:text-white! text-xs">
                  Status: {currentPayment.status}
                </p>
                <p className="text-blue-700! dark:text-white! text-xs">
                  Network: {currentPayment.network}
                </p>
                <p className="text-blue-700! dark:text-white! text-xs mt-2">
                  ⚠️ No wallet address provided
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handleConfirmPayment}
            disabled={
              isSubmitting || notificationSent || isExpiring || !isWindowActive
            }
            className="flex-1 mt-2 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : notificationSent ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Payment Confirmed
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />I Have Made the Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

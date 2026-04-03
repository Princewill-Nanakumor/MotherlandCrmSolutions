// src/components/billing/PaymentRequestDetails.tsx
"use client";

import React, { useState, useRef } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Info,
  CheckCircle,
  ArrowLeft,
  Clock,
} from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { Payment } from "@/types/payment.types";

interface PaymentRequestDetailsProps {
  currentPayment: Payment;
  network: "TRC20" | "ERC20";
  paymentConfirmed: boolean;
  onConfirmPayment: () => void;
  onShowPaymentDetails: () => void;
  onBackToDeposit: () => void;
}

export default function PaymentRequestDetails({
  currentPayment,
  network,
  paymentConfirmed,
  onConfirmPayment,
  onShowPaymentDetails,
  onBackToDeposit,
}: PaymentRequestDetailsProps) {
  const { data: session } = useSession();
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);
  const processingRef = useRef(false);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleBackToDeposit = () => {
    localStorage.removeItem("currentPayment");
    localStorage.removeItem("paymentNetwork");
    localStorage.removeItem("paymentConfirmed");
    localStorage.removeItem(`notification_sent_${currentPayment._id}`);
    onBackToDeposit();
  };

  const handleConfirmPayment = async () => {
    const notificationKey = `notification_sent_${currentPayment._id}`;

    // Prevent double submission and re-entrancy
    if (processingRef.current || isSubmitting || notificationSent) return;

    // Idempotent guard
    const alreadySent = localStorage.getItem(notificationKey);
    if (alreadySent === "true") {
      onConfirmPayment();
      return;
    }

    try {
      processingRef.current = true;
      setIsSubmitting(true);
      setNotificationSent(true);
      // Lock immediately to avoid rapid double-clicks
      localStorage.setItem(notificationKey, "true");

      const deduplicationKey = `payment_confirmation_${currentPayment._id}`;

      console.log("🔄 Creating notification for payment:", {
        paymentId: currentPayment._id,
        userId: session?.user?.id,
        userName: `${session?.user?.firstName} ${session?.user?.lastName}`,
        amount: currentPayment.amount,
        currency: currentPayment.currency,
        network: network,
      });

      const notificationResponse = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Source": "USER_CONFIRMATION",
          "X-Request-ID": `pc_${currentPayment._id}_${Date.now()}`,
        },
        body: JSON.stringify({
          type: "PAYMENT_PENDING_APPROVAL",
          message: `New payment confirmation submitted: ${currentPayment.amount} ${currentPayment.currency} (${network}) by ${session?.user?.firstName} ${session?.user?.lastName}`,
          role: "SUPER_ADMIN",
          link: `/dashboard/payment-details/${currentPayment._id}`, // ← FIXED: Changed from /payments/ to /payment-details/
          paymentId: currentPayment._id,
          amount: currentPayment.amount,
          currency: currentPayment.currency,
          userId: session?.user?.id,
          deduplicationKey,
        }),
      });

      if (!notificationResponse.ok) {
        const errorText = await notificationResponse.text();
        console.error("❌ Failed to create notification:", errorText);
        throw new Error(errorText || "Failed to create notification");
      } else {
        const notificationData = await notificationResponse.json();
        console.log("✅ Notification created successfully:", notificationData);
      }

      onConfirmPayment();
    } catch (error) {
      // Roll back the local lock if server failed
      localStorage.removeItem(notificationKey);
      setNotificationSent(false);
      console.error("❌ Error creating notification:", error);
      // Optionally still proceed:
      // onConfirmPayment();
    } finally {
      setIsSubmitting(false);
      processingRef.current = false;
    }
  };

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
              Thank you for confirming your payment. We are now verifying your
              transaction on the blockchain.
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
                    <li>
                      • We&apos;ll verify your transaction on the blockchain
                    </li>
                    <li>
                      • Processing time:{" "}
                      {network === "TRC20" ? "1-2 minutes" : "5-10 minutes"}
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

  // Original payment request view
  return (
    <div className="space-y-6">
      <div className="p-4 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-700">
        <div className="flex items-center mb-3">
          <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
          <h3 className="font-semibold text-green-800! dark:text-white!">
            Payment Request Created
          </h3>
        </div>
        <p className="text-gray-900! dark:text-white! text-sm mb-4">
          Please send exactly{" "}
          <span className="font-bold text-gray-900! dark:text-white!">
            {currentPayment.amount} USDT
          </span>{" "}
          to the wallet address below. After making payment, click on&quot; I
          have made the payment&quot;
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
                      ? "TRC20 deposits are faster and have lower fees (~1 USDT) compared to ERC20"
                      : "ERC20 deposits may take longer and have higher gas fees (varies)"}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-4 mb-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-start">
              <Info className="h-4 w-4 mt-0.5 mr-2 text-blue-600 dark:text-blue-400 hrink-0" />
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
            disabled={isSubmitting || notificationSent}
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

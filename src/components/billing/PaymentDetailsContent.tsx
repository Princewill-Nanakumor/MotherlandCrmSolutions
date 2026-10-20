// src/components/billing/PaymentDetailsContent.tsx
"use client";

import React from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaymentStatusCard from "./PaymentStatusCard";
import {
  getStatusColor,
  getMethodColor,
  formatCurrency,
  formatDate,
} from "./PaymentUtils";
import {
  getPaymentDisplayParty,
  type Payment,
} from "@/types/payment.types";

interface PaymentDetailsContentProps {
  payment: Payment | null;
  onClose: () => void;
  onNewPayment: () => void;
}

export default function PaymentDetailsContent({
  payment,
  onClose,
  onNewPayment,
}: PaymentDetailsContentProps) {
  if (!payment) {
    return null;
  }

  const displayParty = getPaymentDisplayParty(payment);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Payment Status Card */}
        <Card className="border border-gray-200 shadow-xl backdrop-blur-lg bg-white/70 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900! dark:text-white!">
              <DollarSign className="w-5 h-5" />
              <span>Payment Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm shrink-0 text-gray-600! dark:text-white!">
                  Name
                </span>
                <span className="text-sm font-medium text-right wrap-break-word text-gray-900! dark:text-white!">
                  {displayParty?.displayName || "—"}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-sm shrink-0 text-gray-600! dark:text-white!">
                  Email
                </span>
                <span className="text-sm text-right break-all text-gray-900! dark:text-white!">
                  {displayParty?.email || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600! dark:text-white!">
                  Amount
                </span>
                <span className="text-lg font-semibold text-gray-900! dark:text-white!">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600! dark:text-white!">
                  Status
                </span>
                <Badge className={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600! dark:text-white!">
                  Method
                </span>
                <Badge className={getMethodColor(payment.method)}>
                  {payment.method}
                </Badge>
              </div>

              {payment.network && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600! dark:text-white!">
                    Network
                  </span>
                  <span className="text-sm font-medium text-gray-900! dark:text-white!">
                    {payment.network}
                  </span>
                </div>
              )}

              {payment.walletAddress && (
                <div className="space-y-1">
                  <span className="text-sm text-gray-600! dark:text-white!">
                    Wallet address
                  </span>
                  <p className="font-mono text-sm break-all text-gray-900! dark:text-white!">
                    {payment.walletAddress}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600! dark:text-white!">
                  Created
                </span>
                <span className="text-sm text-gray-900! dark:text-white!">
                  {formatDate(payment.createdAt)}
                </span>
              </div>

              {payment.approvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600! dark:text-white!">
                    Approved
                  </span>
                  <span className="text-sm text-gray-900! dark:text-white!">
                    {formatDate(payment.approvedAt)}
                  </span>
                </div>
              )}

              {payment.description && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm text-gray-600! dark:text-white!">
                    Description
                  </span>
                  <p className="text-sm text-gray-900! dark:text-white! mt-1">
                    {payment.description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentStatusCard
        payment={payment}
        onNewPayment={onNewPayment}
        onCloseModal={onClose}
      />
    </div>
  );
}

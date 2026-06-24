// src/components/billing/PaymentDetailsContent.tsx
"use client";

import React from "react";
import { DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PaymentStatusCard from "./PaymentStatusCard";
import PaymentPartyInfo from "./PaymentPartyInfo";
import {
  getStatusColor,
  getMethodColor,
  formatCurrency,
  formatDate,
} from "./PaymentUtils";
import { Payment } from "@/types/payment.types";

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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        <PaymentPartyInfo
          tenantAccount={payment.tenantAccount}
          submittedBy={payment.submittedBy}
          approvedByUser={payment.approvedByUser}
        />

        {/* Payment Status Card */}
        <Card className="bg-white border border-gray-200 shadow-xl dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900! dark:text-white!">
              <DollarSign className="w-5 h-5" />
              <span>Payment Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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

"use client";

import React from "react";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentPartySummary } from "@/types/payment.types";

interface PaymentPartyInfoProps {
  tenantAccount?: PaymentPartySummary | null;
  submittedBy?: PaymentPartySummary | null;
  approvedByUser?: PaymentPartySummary | null;
}

export default function PaymentPartyInfo({
  tenantAccount,
  submittedBy,
}: PaymentPartyInfoProps) {
  const account = tenantAccount ?? submittedBy;

  if (!account) {
    return null;
  }

  return (
    <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900! dark:text-white!">
          <User className="h-5 w-5" />
          <span>Account</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium text-gray-900! dark:text-white!">
          {account.displayName}
        </p>
        <p className="text-sm text-gray-600! dark:text-gray-300!">
          {account.email}
        </p>
      </CardContent>
    </Card>
  );
}

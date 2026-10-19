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

function PartyRows({
  title,
  party,
}: {
  title: string;
  party: PaymentPartySummary;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500! dark:text-gray-400!">
        {title}
      </p>
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm shrink-0 text-gray-600! dark:text-white!">
          Name
        </span>
        <span className="text-sm font-medium text-right wrap-break-word text-gray-900! dark:text-white!">
          {party.displayName}
        </span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm shrink-0 text-gray-600! dark:text-white!">
          Email
        </span>
        <span className="text-sm text-right break-all text-gray-900! dark:text-white!">
          {party.email || "—"}
        </span>
      </div>
    </div>
  );
}

export default function PaymentPartyInfo({
  tenantAccount,
  submittedBy,
}: PaymentPartyInfoProps) {
  const account = tenantAccount ?? submittedBy;
  const showSubmittedSeparately =
    !!tenantAccount &&
    !!submittedBy &&
    tenantAccount.id !== submittedBy.id;

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
      <CardContent className="space-y-6">
        <PartyRows title="Account holder" party={account} />
        {showSubmittedSeparately && submittedBy ? (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <PartyRows title="Submitted by" party={submittedBy} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

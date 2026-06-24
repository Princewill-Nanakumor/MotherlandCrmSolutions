"use client";

import React from "react";
import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PaymentPartySummary } from "@/types/payment.types";

interface PaymentPartyInfoProps {
  tenantAccount?: PaymentPartySummary | null;
  submittedBy?: PaymentPartySummary | null;
  approvedByUser?: PaymentPartySummary | null;
}

function PartyBlock({
  label,
  party,
}: {
  label: string;
  party: PaymentPartySummary | null | undefined;
}) {
  if (!party) {
    return (
      <div>
        <span className="text-sm text-gray-600! dark:text-white!">{label}</span>
        <p className="text-sm text-gray-500! dark:text-gray-400! mt-1">
          Not available
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="text-sm text-gray-600! dark:text-white!">{label}</span>
      <p className="text-sm font-medium text-gray-900! dark:text-white! mt-1">
        {party.displayName}
      </p>
      <p className="text-sm text-gray-600! dark:text-gray-300!">{party.email}</p>
      {party.role && (
        <Badge className="mt-2 bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800">
          {party.role}
        </Badge>
      )}
    </div>
  );
}

export default function PaymentPartyInfo({
  tenantAccount,
  submittedBy,
  approvedByUser,
}: PaymentPartyInfoProps) {
  if (!tenantAccount && !submittedBy && !approvedByUser) {
    return null;
  }

  return (
    <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900! dark:text-white!">
          <User className="h-5 w-5" />
          <span>Account &amp; Submitter</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PartyBlock label="CRM account" party={tenantAccount} />
        <PartyBlock label="Submitted by" party={submittedBy} />
        {approvedByUser && (
          <PartyBlock label="Approved by" party={approvedByUser} />
        )}
      </CardContent>
    </Card>
  );
}

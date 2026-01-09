// src/components/billing/ErrorMessage.tsx

"use client";

import React from "react";
import { Info } from "lucide-react";

interface ErrorMessageProps {
  error: string | null;
}

export default function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-center">
        <Info className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
        <span className="!text-red-700 dark:!text-white text-sm">{error}</span>
      </div>
    </div>
  );
}

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
    <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
      <div className="flex items-center">
        <Info className="w-4 h-4 mr-2 text-red-600 dark:text-red-400" />
        <span className="text-red-700! dark:text-white! text-sm">{error}</span>
      </div>
    </div>
  );
}

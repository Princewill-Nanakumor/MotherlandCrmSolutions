// src/components/billing/PaymentUtils.tsx

"use client";

export const getStatusColor = (status: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "FAILED":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800";
    case "REFUNDED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
  }
};

export const getMethodColor = (method: string) => {
  switch (method) {
    case "CREDIT_CARD":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800";
    case "PAYPAL":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    case "BANK_TRANSFER":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800";
    case "CRYPTO":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800";
  }
};

// ISO 4217 alphabetic codes are exactly 3 uppercase letters; anything else
// (e.g. "USDT", "BTC") will throw or render oddly via Intl currency style.
// Render those as "<amount> <code>" with locale-aware decimal formatting.
const ISO4217_RE = /^[A-Z]{3}$/;

export const formatCurrency = (amount: number, currency?: string) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const code = (currency || "USD").toUpperCase();

  if (ISO4217_RE.test(code) && code !== "USDT") {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
      }).format(safeAmount);
    } catch {
      // Fall through to the plain-text formatter below.
    }
  }

  const decimal = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  return `${decimal} ${code}`;
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

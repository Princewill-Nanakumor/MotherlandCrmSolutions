// src/components/billing/PaymentStorageManager.tsx

"use client";

import { Payment } from "@/types/payment.types";
import {
  isPaymentConfirmWindowExpired,
  resolvePaymentExpiresAt,
} from "@/lib/paymentConfirmWindow";

/**
 * Single source of truth for billing localStorage keys.
 */
export const PAYMENT_STORAGE_KEYS = {
  CURRENT_PAYMENT: "current_payment",
  PAYMENT_NETWORK: "payment_network",
  PAYMENT_TIMESTAMP: "payment_timestamp",
  PAYMENT_CONFIRMED: "payment_confirmed",
} as const;

const STORAGE_KEYS = PAYMENT_STORAGE_KEYS;

export function clearPaymentStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PAYMENT);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_NETWORK);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_CONFIRMED);
  } catch (error) {
    console.error("Failed to clear payment from localStorage:", error);
  }
}

export function clearNotificationLockForPayment(paymentId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`notification_sent_${paymentId}`);
  } catch {
    // best effort
  }
}

interface PaymentStorageManagerProps {
  currentPayment: Payment | null;
  network: "TRC20" | "ERC20";
  setCurrentPayment: (payment: Payment | null) => void;
  setNetwork: (network: "TRC20" | "ERC20") => void;
  setPaymentConfirmed: (confirmed: boolean) => void;
}

const getPaymentFromStorage = (): {
  payment: Payment | null;
  network: string | null;
  confirmed: boolean;
  expiredUnconfirmed: boolean;
} => {
  try {
    const paymentData = localStorage.getItem(STORAGE_KEYS.CURRENT_PAYMENT);
    const network = localStorage.getItem(STORAGE_KEYS.PAYMENT_NETWORK);
    const confirmed =
      localStorage.getItem(STORAGE_KEYS.PAYMENT_CONFIRMED) === "true";

    if (!paymentData || !network) {
      return {
        payment: null,
        network: null,
        confirmed: false,
        expiredUnconfirmed: false,
      };
    }

    const payment = JSON.parse(paymentData) as Payment;
    const resolvedNetwork = payment.network || network;
    const deadline = resolvePaymentExpiresAt(payment);
    const expiredUnconfirmed =
      !confirmed &&
      !payment.userConfirmedAt &&
      isPaymentConfirmWindowExpired(deadline);

    return {
      payment,
      network: resolvedNetwork,
      confirmed,
      expiredUnconfirmed,
    };
  } catch (error) {
    console.error("Failed to get payment from localStorage:", error);
    return {
      payment: null,
      network: null,
      confirmed: false,
      expiredUnconfirmed: false,
    };
  }
};

export default function PaymentStorageManager({
  currentPayment,
  network,
  setCurrentPayment,
  setNetwork,
  setPaymentConfirmed,
}: PaymentStorageManagerProps) {
  const loadPaymentFromStorage = () => {
    const {
      payment,
      network: storedNetwork,
      confirmed,
      expiredUnconfirmed,
    } = getPaymentFromStorage();

    if (!payment || !storedNetwork) {
      return { expiredUnconfirmed: false as const };
    }

    setCurrentPayment(payment);
    setNetwork(storedNetwork as "TRC20" | "ERC20");
    setPaymentConfirmed(confirmed && !expiredUnconfirmed);

    if (expiredUnconfirmed) {
      return { expiredUnconfirmed: true as const, paymentId: payment._id };
    }

    return { expiredUnconfirmed: false as const };
  };

  const savePaymentToStorage = (confirmed: boolean = false) => {
    if (!currentPayment) return;
    try {
      // Preserve original timestamp so the 1h window is not reset on re-saves
      const existingTs = localStorage.getItem(STORAGE_KEYS.PAYMENT_TIMESTAMP);
      const createdMs = currentPayment.createdAt
        ? new Date(currentPayment.createdAt).getTime()
        : Date.now();
      const timestamp =
        existingTs && !Number.isNaN(Number(existingTs))
          ? existingTs
          : String(Number.isNaN(createdMs) ? Date.now() : createdMs);

      localStorage.setItem(
        STORAGE_KEYS.CURRENT_PAYMENT,
        JSON.stringify(currentPayment),
      );
      localStorage.setItem(
        STORAGE_KEYS.PAYMENT_NETWORK,
        currentPayment.network || network,
      );
      localStorage.setItem(STORAGE_KEYS.PAYMENT_TIMESTAMP, timestamp);
      localStorage.setItem(
        STORAGE_KEYS.PAYMENT_CONFIRMED,
        confirmed.toString(),
      );
    } catch (error) {
      console.error("Failed to save payment to localStorage:", error);
    }
  };

  const clearPaymentFromStorage = () => {
    clearPaymentStorage();
  };

  return {
    loadPaymentFromStorage,
    savePaymentToStorage,
    clearPaymentFromStorage,
  };
}

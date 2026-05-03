// src/components/billing/PaymentStorageManager.tsx

"use client";

import { Payment } from "@/types/payment.types";

/**
 * Single source of truth for billing localStorage keys.
 * Keep helper functions ({@link clearPaymentStorage}, {@link clearNotificationLockForPayment})
 * exported so other components don't hardcode key strings (preventing the
 * `current_payment` vs `currentPayment` mismatch we used to have).
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
} => {
  try {
    const paymentData = localStorage.getItem(STORAGE_KEYS.CURRENT_PAYMENT);
    const network = localStorage.getItem(STORAGE_KEYS.PAYMENT_NETWORK);
    const timestamp = localStorage.getItem(STORAGE_KEYS.PAYMENT_TIMESTAMP);
    const confirmed = localStorage.getItem(STORAGE_KEYS.PAYMENT_CONFIRMED);

    if (!paymentData || !network || !timestamp) {
      return { payment: null, network: null, confirmed: false };
    }

    // Check if the payment is older than 24 hours (86400000 ms)
    const paymentAge = Date.now() - parseInt(timestamp);
    if (paymentAge > 86400000) {
      // Clear expired payment
      clearPaymentFromStorage();
      return { payment: null, network: null, confirmed: false };
    }

    const payment = JSON.parse(paymentData) as Payment;
    return {
      payment,
      network,
      confirmed: confirmed === "true",
    };
  } catch (error) {
    console.error("Failed to get payment from localStorage:", error);
    return { payment: null, network: null, confirmed: false };
  }
};

const clearPaymentFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PAYMENT);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_NETWORK);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.PAYMENT_CONFIRMED);
  } catch (error) {
    console.error("Failed to clear payment from localStorage:", error);
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
    } = getPaymentFromStorage();
    if (payment && storedNetwork) {
      setCurrentPayment(payment);
      setNetwork(storedNetwork as "TRC20" | "ERC20");
      setPaymentConfirmed(confirmed);
    }
  };

  const savePaymentToStorage = (confirmed: boolean = false) => {
    if (currentPayment) {
      try {
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_PAYMENT,
          JSON.stringify(currentPayment)
        );
        localStorage.setItem(STORAGE_KEYS.PAYMENT_NETWORK, network);
        localStorage.setItem(
          STORAGE_KEYS.PAYMENT_TIMESTAMP,
          Date.now().toString()
        );
        localStorage.setItem(
          STORAGE_KEYS.PAYMENT_CONFIRMED,
          confirmed.toString()
        );
      } catch (error) {
        console.error("Failed to save payment to localStorage:", error);
      }
    }
  };

  const clearPaymentFromStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PAYMENT);
      localStorage.removeItem(STORAGE_KEYS.PAYMENT_NETWORK);
      localStorage.removeItem(STORAGE_KEYS.PAYMENT_TIMESTAMP);
      localStorage.removeItem(STORAGE_KEYS.PAYMENT_CONFIRMED);
    } catch (error) {
      console.error("Failed to clear payment from localStorage:", error);
    }
  };

  return {
    loadPaymentFromStorage,
    savePaymentToStorage,
    clearPaymentFromStorage,
  };
}

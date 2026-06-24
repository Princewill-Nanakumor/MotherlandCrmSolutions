// src/types/payment.types.ts

export interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: "CREDIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "CRYPTO";
  transactionId: string;
  description?: string;
  network?: "TRC20" | "ERC20";
  walletAddress?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  adminId?: string;
  createdBy?: string;
  submittedBy?: PaymentPartySummary | null;
  tenantAccount?: PaymentPartySummary | null;
  approvedByUser?: PaymentPartySummary | null;
}

export interface PaymentPartySummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  displayName: string;
}

export interface CreatePaymentData {
  amount: number;
  currency: string;
  method: "CRYPTO";
  network: "TRC20" | "ERC20";
  description: string;
}

export interface CreatePaymentResponse {
  success: boolean;
  payment: Payment;
  message: string;
}

export interface PaymentsResponse {
  success: boolean;
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Transaction {
  id: string;
  amount: number;
  status: string;
  date: string;
  type: string;
}

export interface BillingData {
  balance: number;
  totalDeposits: number;
  pendingAmount: number;
  recentTransactions: Transaction[];
}

// src/types/notification.types.ts
export type NotificationType =
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "PAYMENT_PENDING_APPROVAL";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  role: "SUPER_ADMIN" | "ADMIN" | "AGENT" | "USER";
  link?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  read: boolean;
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userDisplayName?: string;
}

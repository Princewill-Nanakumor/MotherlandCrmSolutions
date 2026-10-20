import type { Notification } from "@/types/notifications";

export type RawNotification = {
  id?: string;
  _id?: string;
  type: string;
  message: string;
  paymentId?: string;
  createdAt: string;
  read: boolean;
  amount?: number;
  currency?: string;
  link?: string;
  role?: string;
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userDisplayName?: string;
  [key: string]: unknown;
};

export function notificationRawId(
  n: Pick<RawNotification, "id" | "_id" | "type" | "paymentId" | "createdAt">,
  idx = 0,
): string {
  return String(
    n.id ||
      n._id ||
      `${n.type || "unknown"}-${n.paymentId || "na"}-${n.createdAt || idx}`,
  );
}

export function normalizeNotifications(
  items: RawNotification[] | null | undefined,
): Notification[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((n, idx) => {
      if (!n || typeof n !== "object") return null;
      return { ...n, id: notificationRawId(n, idx) } as Notification;
    })
    .filter(Boolean) as Notification[];
}

export async function fetchAllNotifications(): Promise<RawNotification[]> {
  const response = await fetch("/api/notifications/all", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
}

export function countUnreadNotifications(
  items: Array<{ read?: boolean }> | null | undefined,
): number {
  return Array.isArray(items) ? items.filter((n) => !n.read).length : 0;
}

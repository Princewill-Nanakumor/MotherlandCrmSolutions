// src/app/dashboard/notifications/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LoadingSpinner } from "@/components/dashboardComponents/LeadsLoadingState";
import NotificationsList from "@/components/notifications/NotificationsList";

interface Notification {
  id: string;
  type: string;
  message: string;
  role: string;
  link?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  createdAt: string;
  read: boolean;
}

// Raw notification from API that might have inconsistent id/_id
interface RawNotification {
  id?: string;
  _id?: string;
  type: string;
  message: string;
  role: string;
  link?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  createdAt: string;
  read: boolean;
  [key: string]: unknown;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize notifications to ensure stable keys
  const normalizeNotifications = useCallback(
    (items: RawNotification[]): Notification[] => {
      return (items || []).map((n, idx) => {
        const safeId =
          n.id ||
          n._id ||
          `${n.type || "unknown"}-${n.paymentId || "na"}-${n.createdAt || idx}`;
        return { ...n, id: String(safeId) } as Notification;
      });
    },
    [],
  );

  // ... (keep all your existing code, just change the fetch URL)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/notifications/all", {
        // Changed from "/api/notifications"
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      const rawData: RawNotification[] = await response.json();
      const normalizedData = normalizeNotifications(rawData);
      setNotifications(normalizedData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch notifications",
      );
    } finally {
      setLoading(false);
    }
  }, [normalizeNotifications]);

  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await fetch(`/api/notifications/${notificationId}`, {
          method: "DELETE",
          credentials: "include",
        });
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      } catch (error) {
        console.error("Error deleting notification:", error);
      }
    },
    [],
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard/notifications";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard/leads");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return null;
  }

  return (
    <div className="min-h-screen border dark:bg-gray-800 rounded-xl">
      <div className="container px-4 py-8 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900! dark:text-white! mb-2">
            Notifications
          </h1>
          <p className="text-gray-600! dark:text-white!">
            View all your payment and subscription notifications
          </p>
        </div>

        {/* Notifications List Component */}
        <NotificationsList
          notifications={notifications}
          loading={loading}
          error={error}
          onDeleteNotification={handleDeleteNotification}
          onRetry={fetchNotifications}
        />
      </div>
    </div>
  );
}

// src/components/notifications/NotificationsList.tsx
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  type: string;
  message: string;
  role: string;
  targetPath?: string;
  link?: string;
  paymentId?: string;
  amount?: number;
  currency?: string;
  userId?: string;
  createdAt: string;
  read: boolean;
}

interface NotificationsListProps {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  onDeleteNotification: (notificationId: string) => void;
  onRetry: () => void;
}

// Loading skeleton component for notifications - matches actual card structure
const NotificationSkeleton = () => (
  <Card className="transition-all bg-gray-50 dark:bg-gray-800 animate-pulse">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1 space-x-4">
          {/* Icon skeleton */}
          <div className="w-5 h-5 bg-gray-200 rounded-full dark:bg-gray-700 shrink-0"></div>
          <div className="flex-1 min-w-0">
            {/* Badges skeleton */}
            <div className="flex items-center mb-2 space-x-2">
              <div className="w-32 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
              <div className="w-12 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            </div>
            {/* Message skeleton - multiple lines */}
            <div className="mb-2 space-y-2"></div>
            {/* Amount skeleton */}
            <div className="h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 w-36"></div>
            {/* Date skeleton */}
            <div className="w-40 h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* View button skeleton */}
          <div className="w-16 h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
          {/* Delete button skeleton */}
          <div className="w-8 h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function NotificationsList({
  notifications,
  loading,
  error,
  onRetry,
}: NotificationsListProps) {
  const router = useRouter();

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case "PAYMENT_APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "PAYMENT_REJECTED":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "PAYMENT_PENDING_APPROVAL":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  }, []);

  const getNotificationTypeColor = useCallback((type: string) => {
    switch (type) {
      case "PAYMENT_APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "PAYMENT_REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      case "PAYMENT_PENDING_APPROVAL":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    }
  }, []);

  const handleViewNotification = useCallback(
    (notification: Notification) => {
      // Prefer backend-provided explicit target path; fallback to known id fields.
      if (notification.targetPath) {
        router.push(notification.targetPath);
        return;
      }
      if (notification.paymentId) {
        router.push(`/dashboard/payment-details/${notification.paymentId}`);
        return;
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [router],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
        <NotificationSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <CardContent className="p-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button onClick={onRetry} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="border bg-gray-50 dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900! dark:text-white! mb-2">
            No notifications
          </h3>
          <p className="text-gray-500! dark:text-white!">
            You don&apos;t have any notifications yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={`transition-all bg-gray-50 dark:bg-gray-800 ${
            !notification.read
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
              : ""
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1 space-x-4">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-2 space-x-2">
                    <Badge
                      className={getNotificationTypeColor(notification.type)}
                    >
                      {notification.type.replace(/_/g, " ")}
                    </Badge>
                    {!notification.read && (
                      <Badge className="text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-900! dark:text-white! mb-2">
                    {notification.message}
                  </p>
                  {notification.amount && (
                    <p className="text-sm text-gray-600! dark:text-white! mb-2">
                      Amount: {notification.amount} {notification.currency}
                    </p>
                  )}
                  <p className="text-xs text-gray-500! dark:text-white!">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {notification.link && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewNotification(notification)}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

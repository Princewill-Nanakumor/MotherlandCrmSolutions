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
        <div className="flex items-start space-x-4 flex-1">
          {/* Icon skeleton */}
          <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            {/* Badges skeleton */}
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-32"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-12"></div>
            </div>
            {/* Message skeleton - multiple lines */}
            <div className="space-y-2 mb-2"></div>
            {/* Amount skeleton */}
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-2"></div>
            {/* Date skeleton */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* View button skeleton */}
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          {/* Delete button skeleton */}
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "PAYMENT_REJECTED":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "PAYMENT_PENDING_APPROVAL":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
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
      if (notification.link) {
        // Extract payment ID and redirect to new dynamic route
        const paymentIdMatch = notification.link.match(/\/payments\/([^\/]+)$/);
        if (paymentIdMatch) {
          const paymentId = paymentIdMatch[1];
          router.push(`/dashboard/payment-details/${paymentId}`);
        } else {
          // Fallback to original link if pattern doesn't match
          router.push(notification.link);
        }
      }
    },
    [router]
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
      <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
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
      <Card className="bg-gray-50 dark:bg-gray-800 border">
        <CardContent className="p-8 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium !text-gray-900 dark:!text-white mb-2">
            No notifications
          </h3>
          <p className="!text-gray-500 dark:!text-white">
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
              <div className="flex items-start space-x-4 flex-1">
                {getNotificationIcon(notification.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge
                      className={getNotificationTypeColor(notification.type)}
                    >
                      {notification.type.replace(/_/g, " ")}
                    </Badge>
                    {!notification.read && (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="!text-gray-900 dark:!text-white mb-2">
                    {notification.message}
                  </p>
                  {notification.amount && (
                    <p className="text-sm !text-gray-600 dark:!text-white mb-2">
                      Amount: {notification.amount} {notification.currency}
                    </p>
                  )}
                  <p className="text-xs !text-gray-500 dark:!text-white">
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
                    <ExternalLink className="h-4 w-4 mr-1" />
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

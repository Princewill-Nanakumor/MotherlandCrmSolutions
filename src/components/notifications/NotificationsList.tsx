// src/components/notifications/NotificationsList.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DELETE_ICON_BUTTON_CLASS } from "@/lib/actionIconButtonStyles";

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
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userDisplayName?: string;
  createdAt: string;
  read: boolean;
  resolvedStatus?: "APPROVED" | "REJECTED" | string;
}

function notificationUserLabel(notification: Notification): string | null {
  if (notification.userDisplayName?.trim()) {
    return notification.userDisplayName.trim();
  }
  const name =
    `${notification.userFirstName ?? ""} ${notification.userLastName ?? ""}`.trim();
  return name || null;
}

interface NotificationsListProps {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  onDeleteNotifications: (notificationIds: string[]) => Promise<void>;
  isDeleting?: boolean;
  onRetry: () => void;
}

function displayNotificationType(notification: Notification): string {
  if (notification.type === "PAYMENT_PENDING_APPROVAL") {
    if (notification.resolvedStatus === "APPROVED") return "PAYMENT_APPROVED";
    if (notification.resolvedStatus === "REJECTED") return "PAYMENT_REJECTED";
  }
  return notification.type;
}

function displayNotificationLabel(type: string): string {
  return type.replace(/_/g, " ");
}

const NotificationSkeleton = () => (
  <Card className="transition-all bg-gray-50 dark:bg-gray-800 animate-pulse">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start flex-1 space-x-4">
          <div className="w-5 h-5 bg-gray-200 rounded-full dark:bg-gray-700 shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-2 space-x-2">
              <div className="w-32 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
              <div className="w-12 h-6 bg-gray-200 rounded-full dark:bg-gray-700"></div>
            </div>
            <div className="mb-2 space-y-2"></div>
            <div className="h-4 mb-2 bg-gray-200 rounded dark:bg-gray-700 w-36"></div>
            <div className="w-40 h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-16 h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
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
  onDeleteNotifications,
  isDeleting = false,
  onRetry,
}: NotificationsListProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(
    null,
  );

  const allIds = useMemo(
    () => notifications.map((n) => n.id),
    [notifications],
  );
  const selectedCount = selectedIds.size;
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedCount > 0 && !allSelected;

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

  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(allIds) : new Set());
    },
    [allIds],
  );

  const requestDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteIds?.length) return;
    const ids = pendingDeleteIds;
    try {
      await onDeleteNotifications(ids);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      setPendingDeleteIds(null);
    } catch {
      // Parent shows toast; keep dialog open so user can retry or cancel.
    }
  }, [onDeleteNotifications, pendingDeleteIds]);

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

  const pendingCount = pendingDeleteIds?.length ?? 0;

  return (
    <div className={`space-y-4 ${selectedCount > 0 ? "pb-24" : ""}`}>
      <div className="sticky top-0 z-20 flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm px-4 py-3 shadow-sm">
        <label className="flex items-center gap-2 text-sm text-gray-700! dark:text-white! cursor-pointer select-none">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(value) => toggleSelectAll(value === true)}
            disabled={isDeleting}
            aria-label="Select all notifications"
          />
          <span>
            {selectedCount > 0
              ? `${selectedCount} selected`
              : "Select all"}
          </span>
        </label>
      </div>

      {notifications.map((notification) => {
        const displayType = displayNotificationType(notification);
        const isSelected = selectedIds.has(notification.id);
        const userLabel = notificationUserLabel(notification);
        const canView = Boolean(
          notification.link ||
            notification.targetPath ||
            notification.paymentId,
        );
        return (
          <Card
            key={notification.id}
            className={`transition-all bg-gray-50 dark:bg-gray-800 ${
              !notification.read
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                : ""
            } ${isSelected ? "ring-1 ring-(--brand-from)/40" : ""}`}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3 min-w-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start flex-1 min-w-0 gap-3 sm:gap-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(value) =>
                      toggleSelect(notification.id, value === true)
                    }
                    disabled={isDeleting}
                    aria-label={`Select notification ${notification.id}`}
                    className="mt-1"
                  />
                  {getNotificationIcon(displayType)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className={getNotificationTypeColor(displayType)}>
                        {displayNotificationLabel(displayType)}
                      </Badge>
                      {!notification.read && (
                        <Badge className="text-blue-800 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="mb-2 text-gray-900! wrap-break-word dark:text-white!">
                      {notification.message}
                    </p>
                    {(userLabel || notification.userEmail) && (
                      <div className="mb-2 space-y-0.5 text-sm text-gray-600! dark:text-white!">
                        {userLabel ? (
                          <p>
                            <span className="text-gray-500! dark:text-gray-400!">
                              Name:{" "}
                            </span>
                            {userLabel}
                          </p>
                        ) : null}
                        {notification.userEmail ? (
                          <p className="break-all">
                            <span className="text-gray-500! dark:text-gray-400!">
                              Email:{" "}
                            </span>
                            {notification.userEmail}
                          </p>
                        ) : null}
                      </div>
                    )}
                    {notification.amount ? (
                      <p className="mb-2 text-sm text-gray-600! dark:text-white!">
                        Amount: {notification.amount} {notification.currency}
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-500! dark:text-white!">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                  {canView ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewNotification(notification)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={DELETE_ICON_BUTTON_CLASS}
                    disabled={isDeleting}
                    aria-label="Delete notification"
                    onClick={() => requestDelete([notification.id])}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog
        open={pendingDeleteIds !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDeleteIds(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCount === 1
                ? "Delete this notification?"
                : `Delete ${pendingCount} notifications?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.{" "}
              {pendingCount === 1
                ? "The notification will be permanently removed."
                : "The selected notifications will be permanently removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-white bg-red-600 hover:bg-red-700 hover:text-white focus:ring-red-600"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : pendingCount === 1 ? (
                "Delete notification"
              ) : (
                `Delete ${pendingCount}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-4 py-2.5">
            <span className="text-sm font-medium text-gray-700! dark:text-white!">
              {selectedCount} selected
            </span>
            <Button
              size="sm"
              disabled={isDeleting}
              onClick={() => requestDelete([...selectedIds])}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

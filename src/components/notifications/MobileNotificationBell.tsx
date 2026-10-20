"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { notificationKeys } from "@/lib/notificationKeys";
import {
  fetchAllNotifications,
  normalizeNotifications,
  notificationRawId,
  type RawNotification,
} from "@/lib/notificationList";
import { useAblyAwareRefetchInterval } from "@/hooks/useAblyAwareRefetchInterval";
import type { Notification } from "@/types/notifications";

/**
 * Compact notification bell for small screens only.
 * Desktop uses the sidebar Notifications item; Ably refresh lives in
 * PaymentNotificationsRealtimeSync.
 */
export function MobileNotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const notificationsPollMs = useAblyAwareRefetchInterval(60_000);

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<RawNotification[], Error, Notification[]>({
    queryKey: notificationKeys.all,
    queryFn: fetchAllNotifications,
    select: normalizeNotifications,
    enabled: !!session?.user && session.user.role === "ADMIN",
    staleTime: 15_000,
    refetchInterval: notificationsPollMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiCallWithSessionRefresh(
        `/api/notifications/${notificationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return notificationId;
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<RawNotification[]>(
        notificationKeys.all,
      );
      queryClient.setQueryData<RawNotification[]>(notificationKeys.all, (old) =>
        (old ?? []).map((n) =>
          notificationRawId(n) === notificationId
            ? { ...n, read: true }
            : n,
        ),
      );
      return { previous };
    },
    onError: (_e, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await markAsReadMutation.mutateAsync(notification.id);
      }
      if (notification.link) {
        const paymentIdMatch = notification.link.match(
          /\/payment-details\/([^/?]+)/,
        );
        router.push(
          paymentIdMatch
            ? `/dashboard/payment-details/${paymentIdMatch[1]}`
            : notification.link,
        );
      } else if (notification.paymentId) {
        router.push(`/dashboard/payment-details/${notification.paymentId}`);
      }
      setOpen(false);
    } catch {
      void refetch();
    }
  };

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case "PAYMENT_APPROVED":
        return (
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0 dark:text-green-400" />
        );
      case "PAYMENT_REJECTED":
        return (
          <XCircle className="w-4 h-4 text-red-600 shrink-0 dark:text-red-400" />
        );
      case "PAYMENT_PENDING_APPROVAL":
        return (
          <Clock className="w-4 h-4 text-yellow-600 shrink-0 dark:text-yellow-400" />
        );
      default:
        return (
          <Bell className="w-4 h-4 text-blue-600 shrink-0 dark:text-blue-400" />
        );
    }
  }, []);

  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const shouldShowLoading =
    isLoading || (isFetching && notifications.length === 0);

  return (
    <div className="relative md:hidden" ref={dropdownRef}>
      <button
        type="button"
        className="relative p-2 transition rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) void refetch();
        }}
      >
        <Bell className="h-6 w-6 brand-navbar-text" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 [font-family:var(--brand-font-body)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-9999 mt-2 w-[min(20rem,calc(100vw-1.5rem))] max-w-xs rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 [font-family:var(--brand-font-body)]">
          <div className="flex items-center justify-between border-b border-gray-100 p-3 font-semibold text-gray-800! dark:border-gray-800 dark:text-gray-100! [font-family:var(--brand-font-heading)]">
            <span>Notifications</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push("/dashboard/notifications");
                setOpen(false);
              }}
              className="h-6 px-2 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View All
            </Button>
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {shouldShowLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <li
                  key={`skeleton-${index}`}
                  className="flex items-start justify-between px-4 py-3 animate-pulse"
                >
                  <div className="flex flex-1 items-start space-x-3">
                    <div className="h-4 w-4 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                </li>
              ))
            ) : error ? (
              <li className="p-4 text-center text-red-500! dark:text-red-400!">
                <p className="text-sm">Failed to load notifications</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void refetch()}
                  className="mt-2 text-xs"
                >
                  Retry
                </Button>
              </li>
            ) : notifications.length === 0 ? (
              <li className="p-4 text-center text-gray-500! dark:text-gray-400!">
                No notifications
              </li>
            ) : (
              notifications.slice(0, 20).map((notification) => (
                <li
                  key={notification.id}
                  className={`flex cursor-pointer items-start justify-between border-b px-4 py-3 transition hover:bg-purple-50 dark:hover:bg-gray-800 ${
                    !notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <div className="flex flex-1 items-start space-x-3">
                    {getNotificationIcon(notification.type)}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          !notification.read
                            ? "font-medium text-gray-900! dark:text-white!"
                            : "text-gray-600! dark:text-gray-300!"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-500! dark:text-gray-400!">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!notification.read ? (
                    <button
                      type="button"
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      aria-label="Mark as read"
                      onClick={(event) => {
                        event.stopPropagation();
                        void markAsReadMutation.mutateAsync(notification.id);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

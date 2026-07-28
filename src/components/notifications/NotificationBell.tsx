// src/components/notifications/NotificationBell.tsx
"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Bell,
  X,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Notification } from "@/types/notifications";
import { Button } from "@/components/ui/button";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { notificationKeys } from "@/lib/notificationKeys";
import { billingKeys } from "@/hooks/useBillingData";
import { getAblyRealtimeClient } from "@/libs/ablyClient";
import { useAblyAwareRefetchInterval } from "@/hooks/useAblyAwareRefetchInterval";
import { useAblyChannelAttached } from "@/hooks/useAblyChannelAttached";
import {
  PAYMENT_NOTIFICATION_EVENT,
  getSuperAdminNotificationsChannelName,
  getUserNotificationsChannelName,
} from "@/libs/realtime";
import type { Connection, RealtimeChannel } from "ably";

// Raw notification type from API (may have inconsistent id/_id)
interface RawNotification {
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
  [key: string]: unknown;
}

// Loading skeleton component for notification dropdown
const NotificationSkeleton = () => (
  <li className="flex items-start justify-between px-4 py-3 animate-pulse">
    <div className="flex items-start flex-1 space-x-3">
      <div className="w-4 h-4 bg-gray-200 rounded-full dark:bg-gray-700 shrink-0"></div>
      <div className="flex-1 min-w-0">
        <div className="space-y-1">
          <div className="w-full h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
          <div className="w-3/4 h-3 bg-gray-200 rounded dark:bg-gray-700"></div>
        </div>
        <div className="w-20 h-2 mt-1 bg-gray-200 rounded dark:bg-gray-700"></div>
        <div className="w-16 h-2 mt-1 bg-gray-200 rounded dark:bg-gray-700"></div>
      </div>
    </div>
    <div className="w-4 h-4 ml-2 bg-gray-200 rounded shrink-0 dark:bg-gray-700"></div>
  </li>
);

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adminScope, setAdminScope] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [notificationsChannel, setNotificationsChannel] =
    useState<RealtimeChannel | null>(null);
  const [ablyConnection, setAblyConnection] = useState<Connection | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const notificationsChannelReady = useAblyChannelAttached(
    notificationsChannel,
    ablyConnection,
  );
  const notificationsPollMs = useAblyAwareRefetchInterval(60_000, {
    channelReady: notificationsChannelReady,
  });

  // Normalize notifications to ensure stable keys and API compatibility
  const normalizeNotifications = useCallback(
    (items: RawNotification[]): Notification[] => {
      if (!Array.isArray(items)) {
        return [];
      }

      const normalized = items
        .map((n, idx) => {
          if (!n || typeof n !== "object") {
            return null;
          }

          const safeId =
            n.id ||
            n._id ||
            `${n.type || "unknown"}-${n.paymentId || "na"}-${n.createdAt || idx}`;

          return { ...n, id: String(safeId) } as Notification;
        })
        .filter(Boolean) as Notification[];

      return normalized;
    },
    [],
  );

  // Fetch ALL notifications, not just unread ones
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<RawNotification[], Error, Notification[]>({
    queryKey: notificationKeys.all,
    queryFn: async (): Promise<RawNotification[]> => {
      const response = await fetch("/api/notifications/all", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: Failed to fetch notifications`,
        );
      }

      const data = await response.json();
      return data;
    },
    select: (data) => normalizeNotifications(data),
    enabled: !!session?.user,
    staleTime: 15 * 1000,
    // Ably is primary; slow poll when connected, faster when not
    refetchInterval: notificationsPollMs,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });

  // Resolve Ably scope (super-admin flag also comes from session when present)
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;

    const sessionSuperAdmin = Boolean(
      (session.user as { isSuperAdmin?: boolean }).isSuperAdmin,
    );
    if (sessionSuperAdmin) {
      setIsSuperAdmin(true);
    }

    void (async () => {
      try {
        const scopeResponse = await fetch("/api/ably/scope", {
          method: "GET",
          credentials: "include",
        });
        if (!scopeResponse.ok) return;
        const scopeData = (await scopeResponse.json()) as {
          adminScope?: string;
          isSuperAdmin?: boolean;
        };
        if (cancelled) return;
        if (scopeData.adminScope) setAdminScope(scopeData.adminScope);
        setIsSuperAdmin(
          Boolean(scopeData.isSuperAdmin) || sessionSuperAdmin,
        );
      } catch {
        // Fallback polling continues
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    session?.user?.id,
    (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin,
  ]);

  // Realtime payment notification updates (approve / reject / pending)
  useEffect(() => {
    if (!session?.user?.id || !adminScope) {
      setNotificationsChannel(null);
      setAblyConnection(null);
      return;
    }

    let cancelled = false;
    const realtime = getAblyRealtimeClient(session.user.id);
    setAblyConnection(realtime.connection);
    const channels: Array<{
      name: string;
      channel: ReturnType<typeof realtime.channels.get>;
    }> = [];

    const refreshNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    };

    const refreshBilling = (paymentId?: string) => {
      void queryClient.invalidateQueries({
        queryKey: billingKeys.paymentsRoot(),
      });
      void queryClient.invalidateQueries({ queryKey: billingKeys.balance() });
      if (paymentId) {
        void queryClient.invalidateQueries({
          queryKey: billingKeys.payment(paymentId),
        });
      }
    };

    const onUserPaymentNotification = (message: { data?: unknown }) => {
      const payload = (message.data ?? {}) as {
        type?: string;
        paymentId?: string;
      };
      refreshNotifications();
      if (
        payload.type === "PAYMENT_APPROVED" ||
        payload.type === "PAYMENT_REJECTED"
      ) {
        refreshBilling(payload.paymentId);
      }
    };

    // Super-admin channel: notifications only (billing belongs to another tenant)
    const onSuperAdminPaymentNotification = () => {
      refreshNotifications();
    };

    const userChannelName = getUserNotificationsChannelName(
      adminScope,
      session.user.id,
    );
    const userChannel = realtime.channels.get(userChannelName);
    setNotificationsChannel(userChannel);
    channels.push({
      name: userChannelName,
      channel: userChannel,
    });

    if (isSuperAdmin) {
      const superName = getSuperAdminNotificationsChannelName();
      channels.push({
        name: superName,
        channel: realtime.channels.get(superName),
      });
    }

    void (async () => {
      for (const entry of channels) {
        if (cancelled) return;
        try {
          await entry.channel.attach();
          if (cancelled) {
            void entry.channel.detach().catch(() => undefined);
            return;
          }
          const listener =
            entry.name === getSuperAdminNotificationsChannelName()
              ? onSuperAdminPaymentNotification
              : onUserPaymentNotification;
          entry.channel.subscribe(PAYMENT_NOTIFICATION_EVENT, listener);
        } catch {
          // Keep polling fallback
        }
      }
    })();

    return () => {
      cancelled = true;
      setNotificationsChannel(null);
      setAblyConnection(null);
      for (const entry of channels) {
        try {
          entry.channel.unsubscribe(PAYMENT_NOTIFICATION_EVENT);
        } catch {
          // ignore
        }
        void entry.channel.detach().catch(() => undefined);
        try {
          realtime.channels.release(entry.name);
        } catch {
          // ignore
        }
      }
    };
  }, [session?.user?.id, adminScope, isSuperAdmin, queryClient]);

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
        throw new Error(`Failed to mark notification as read: ${response.status}`);
      }
      return notificationId;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previousNotifications =
        queryClient.getQueryData<RawNotification[]>(notificationKeys.all);

      // Cache stores API docs (`_id`); UI uses normalized `id` — match both.
      queryClient.setQueryData<RawNotification[]>(
        notificationKeys.all,
        (old = []) =>
          old.map((n) => {
            const id = String(n.id || n._id || "");
            return id === notificationId ? { ...n, read: true } : n;
          }),
      );

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          notificationKeys.all,
          context.previousNotifications,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  // Simplified dropdown toggle
  const handleDropdownToggle = useCallback(() => {
    setOpen((prev) => !prev);

    // Always refetch when opening to ensure fresh data
    if (!open) {
      refetch();
    }
  }, [open, refetch]);

  // Close dropdown on outside click
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark notification as read if not already read
      if (!notification.read) {
        await markAsReadMutation.mutateAsync(notification.id);
      }

      // Enhanced navigation logic
      if (notification.link) {
        const paymentIdMatch = notification.link.match(
          /\/payment-details\/([^\/\?]+)/,
        );

        if (paymentIdMatch) {
          const paymentId = paymentIdMatch[1];
          router.push(`/dashboard/payment-details/${paymentId}`);
        } else {
          router.push(notification.link);
        }
      }

      setOpen(false);
    } catch (error) {
      console.error("Error handling notification click:", error);
      refetch();
    }
  };

  const handleClearNotification = useCallback(
    async (notificationId: string, event: React.MouseEvent) => {
      event.stopPropagation();

      try {
        await markAsReadMutation.mutateAsync(notificationId);
      } catch (error) {
        console.error("Error clearing notification:", error);
        refetch();
      }
    },
    [markAsReadMutation, refetch],
  );

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

  // Count only unread notifications for the badge
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Simplified loading logic
  const shouldShowLoading =
    isLoading || (isFetching && notifications.length === 0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 transition rounded-full hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Notifications"
        type="button"
        onClick={handleDropdownToggle}
      >
        <Bell className="h-6 w-6 brand-navbar-text" />
        {/* Only show badge if there are unread notifications */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full px-1.5 py-0.5 [font-family:var(--brand-font-body)]">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 max-w-xs mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-80 dark:bg-gray-900 dark:border-gray-700 z-9999 [font-family:var(--brand-font-body)]">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 font-semibold text-gray-800! dark:text-gray-100! flex justify-between items-center [font-family:var(--brand-font-heading)]">
            <span>Notifications</span>
            <div className="flex items-center space-x-2">
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
          </div>

          <ul className="overflow-y-auto max-h-64">
            {shouldShowLoading ? (
              // Show loading skeleton
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <NotificationSkeleton key={`skeleton-${index}`} />
                ))}
              </>
            ) : error ? (
              <li className="p-4 text-center text-red-500! dark:text-red-400!">
                <p className="text-sm">Failed to load notifications</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
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
              <>
                <div className="p-2 text-gray-800! dark:text-white! text-xs text-center border-b">
                  Showing {notifications.length} notifications ({unreadCount}{" "}
                  unread)
                </div>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`flex items-start border-b justify-between px-4 py-3 hover:bg-purple-50 dark:hover:bg-gray-800 transition cursor-pointer ${
                      !notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start flex-1 space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm ${
                            !notification.read
                              ? "font-medium text-gray-900! dark:text-white!"
                              : "text-gray-600! dark:text-gray-300!"
                          }`}
                        >
                          {notification.message}
                        </p>
                        {notification.amount && (
                          <p className="text-xs text-gray-500! dark:text-gray-400! mt-1">
                            Amount: {notification.amount}{" "}
                            {notification.currency}
                          </p>
                        )}
                        <p className="text-xs text-gray-400! dark:text-gray-500! mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {/* Only show X button for unread notifications */}
                    {!notification.read && (
                      <div
                        className="p-1 ml-2 transition-colors rounded cursor-pointer shrink-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                        onClick={(e) =>
                          handleClearNotification(notification.id, e)
                        }
                        title="Mark as read"
                      >
                        <X className="w-4 h-4 text-gray-400 transition-colors hover:text-red-500" />
                      </div>
                    )}
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

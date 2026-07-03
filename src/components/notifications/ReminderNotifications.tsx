// src/components/notifications/ReminderNotifications.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reminder } from "@/types/leads";
import { alarmSound, stopNotificationSound } from "@/lib/notificationSound";
import { formatTime24Hour } from "@/lib/utils";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import { formatLocalDateYmd } from "@/lib/reminderDueAt";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { getAblyRealtimeClient } from "@/libs/ablyClient";
import { useAppBranding } from "@/components/AppBrandingProvider";
import {
  REMINDER_DUE_EVENT,
  getUserRemindersChannelName,
} from "@/libs/realtime";

/** Stable fallback so “no data” is not a fresh [] every render (that retriggered useEffect → setState loop). */
const EMPTY_DUE_REMINDERS: Reminder[] = [];

export default function ReminderNotifications() {
  const { status, data: session } = useSession();
  const { shortName } = useAppBranding();
  const sessionUserId = session?.user?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Reminder[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [adminScope, setAdminScope] = useState<string | null>(null);
  const soundPlayingRef = useRef<boolean>(false);
  const lastReminderIdsRef = useRef<string>("");

  // Request browser notification permission
  useEffect(() => {
    if (hasAuthorizedSession(status, session) && "Notification" in window) {
      if (Notification.permission === "granted") {
        setPermissionGranted(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          setPermissionGranted(permission === "granted");
        });
      } else {
        setPermissionGranted(false);
      }
    }
  }, [status, session, sessionUserId]);

  // Poll for due reminders - pass user's local date/time for correct timezone comparison
  const { data, refetch } = useQuery<Reminder[]>({
    queryKey: ["dueReminders"],
    queryFn: async () => {
      try {
        const now = new Date();
        const userDate = formatLocalDateYmd(now);
        const userTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        const url = `/api/reminders/check-due?userDate=${encodeURIComponent(userDate)}&userTime=${encodeURIComponent(userTime)}`;
        const response = await apiCallWithSessionRefresh(url);
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching due reminders:", error);
        return [];
      }
    },
    enabled: hasAuthorizedSession(status, session),
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  });

  const dueReminders = data ?? EMPTY_DUE_REMINDERS;

  // Resolve admin scope for Ably reminders channel
  useEffect(() => {
    if (!hasAuthorizedSession(status, session)) return;
    let cancelled = false;

    void (async () => {
      try {
        const scopeResponse = await fetch("/api/ably/scope", {
          method: "GET",
          credentials: "include",
        });
        if (!scopeResponse.ok) return;
        const scopeData = (await scopeResponse.json()) as { adminScope?: string };
        if (!cancelled && scopeData.adminScope) {
          setAdminScope(scopeData.adminScope);
        }
      } catch {
        // Ignore and keep fallback polling
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session]);

  // Subscribe to server-pushed due reminder events (primary delivery path)
  useEffect(() => {
    if (!session?.user?.id || !adminScope) return;

    const realtime = getAblyRealtimeClient(session.user.id);
    const channelName = getUserRemindersChannelName(adminScope, session.user.id);
    const channel = realtime.channels.get(channelName);

    const onReminderDue = () => {
      void refetch();
    };

    let subscribed = false;
    void (async () => {
      try {
        await channel.attach();
        channel.subscribe(REMINDER_DUE_EVENT, onReminderDue);
        subscribed = true;
      } catch {
        // Fallback polling continues if realtime attach fails.
      }
    })();

    return () => {
      if (subscribed) {
        channel.unsubscribe(REMINDER_DUE_EVENT, onReminderDue);
      }
      void channel.detach().catch(() => undefined);
      try {
        realtime.channels.release(channelName);
      } catch {
        // ignore
      }
    };
  }, [session?.user?.id, adminScope, refetch]);

  // Create a stable reminder IDs string for comparison
  const reminderIdsString = useMemo(() => {
    if (!dueReminders || dueReminders.length === 0) return "";
    return dueReminders
      .map((r) => r._id)
      .sort()
      .join(",");
  }, [dueReminders]);

  // Handle notification updates - only when dueReminders actually changes
  useEffect(() => {
    if (!dueReminders || dueReminders.length === 0) {
      lastReminderIdsRef.current = "";
      setNotifications((prev) => (prev.length === 0 ? prev : []));
      if (soundPlayingRef.current) {
        stopNotificationSound();
        soundPlayingRef.current = false;
      }
      return;
    }

    // Only update if the reminders have actually changed
    if (reminderIdsString === lastReminderIdsRef.current) {
      return;
    }

    lastReminderIdsRef.current = reminderIdsString;

    // Update notifications with a stable reference
    setNotifications([...dueReminders]);

    // Handle sound
    const soundEnabledReminders = dueReminders.filter((r) => r.soundEnabled);

    if (soundEnabledReminders.length > 0 && !soundPlayingRef.current) {
      alarmSound.start();
      soundPlayingRef.current = true;
    }

    // Show browser notifications
    if (permissionGranted && "Notification" in window) {
      dueReminders.forEach((reminder) => {
        const leadName =
          typeof reminder.leadId === "object"
            ? `${reminder.leadId.firstName} ${reminder.leadId.lastName}`
            : "Lead";

        try {
          const notification = new Notification(`${shortName} reminder: ${reminder.title}`, {
            body: `${reminder.type} - ${leadName}\n${reminder.description || ""}`,
            icon: "/Motherlandfav.png",
            badge: "/Motherlandfav.png",
            tag: reminder._id,
            requireInteraction: true,
            silent: true,
          });

          notification.onclick = () => {
            window.focus();
            if (typeof reminder.leadId === "object") {
              const leadId = reminder.leadId._id;
              const path =
                session?.user?.role === "ADMIN"
                  ? `/dashboard/all-leads/${leadId}`
                  : `/dashboard/leads/${leadId}`;
              router.push(path);
            }
            notification.close();
          };
        } catch (error) {
          console.error("Error creating browser notification:", error);
        }
      });
    }
    // reminderIdsString + lastReminderIdsRef skip duplicate work when only the array ref changes
    // but IDs are unchanged. dueReminders is listed for exhaustive-deps; empty uses EMPTY_DUE_REMINDERS.
  }, [
    dueReminders,
    reminderIdsString,
    permissionGranted,
    router,
    session?.user?.role,
  ]);

  const dismissNotification = useCallback(
    async (reminder: Reminder, options?: { persistToDb?: boolean }) => {
      const { persistToDb = true } = options ?? {};

      // Optimistically remove from local state
      setNotifications((prev) => {
        const updated = prev.filter((n) => n._id !== reminder._id);
        if (updated.length === 0 && soundPlayingRef.current) {
          stopNotificationSound();
          soundPlayingRef.current = false;
        }
        return updated;
      });

      if (!persistToDb) {
        queryClient.invalidateQueries({ queryKey: ["dueReminders"] });
        return;
      }

      try {
        const leadId =
          typeof reminder.leadId === "object"
            ? reminder.leadId._id
            : reminder.leadId;

        const response = await apiCallWithSessionRefresh(
          `/api/leads/${leadId}/reminders/${reminder._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DISMISSED" }),
          },
        );

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["dueReminders"] });
          queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
          queryClient.refetchQueries({ queryKey: ["activities", leadId] });
        }
      } catch (error) {
        console.error("Error dismissing reminder:", error);
      }
    },
    [queryClient],
  );

  const handleNotificationClick = useCallback(
    (reminder: Reminder) => {
      if (soundPlayingRef.current) {
        stopNotificationSound();
        soundPlayingRef.current = false;
      }

      if (typeof reminder.leadId === "object" && reminder.leadId._id) {
        const leadId = reminder.leadId._id;
        const currentPath = window.location.pathname;

        if (currentPath.includes("/all-leads")) {
          router.push(`/dashboard/all-leads/${leadId}`);
        } else {
          router.push(`/dashboard/leads/${leadId}`);
        }
      }

      dismissNotification(reminder);
    },
    [dismissNotification, router],
  );

  const handleMarkAsComplete = useCallback(
    async (reminder: Reminder) => {
      try {
        if (soundPlayingRef.current) {
          stopNotificationSound();
          soundPlayingRef.current = false;
        }

        // Handle leadId being either string or object
        const leadId =
          typeof reminder.leadId === "object"
            ? reminder.leadId._id
            : reminder.leadId;

        const response = await apiCallWithSessionRefresh(
          `/api/leads/${leadId}/reminders/${reminder._id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "COMPLETED" }),
          },
        );

        if (response.ok) {
          // Remove from UI only - don't overwrite COMPLETED with DISMISSED in DB
          dismissNotification(reminder, { persistToDb: false });
          queryClient.invalidateQueries({ queryKey: ["dueReminders"] });
          queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
          queryClient.refetchQueries({ queryKey: ["activities", leadId] });
        }
      } catch (error) {
        console.error("Error marking reminder as complete:", error);
      }
    },
    [dismissNotification, queryClient],
  );

  // Don't render anything until authentication is complete
  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed z-50 max-w-sm mt-2 space-y-2 border-t right-2 top-20">
      {notifications.map((reminder) => (
        <div
          key={reminder._id}
          className="p-4 bg-white border-l-4 border-indigo-500 rounded-lg shadow-lg dark:bg-gray-800 animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-shake-bell" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    {reminder.title}
                  </h4>
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    {reminder.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                      {reminder.type}
                    </span>
                    <Clock className="w-3 h-3" />
                    {formatTime24Hour(reminder.reminderTime)}
                    {typeof reminder.leadId === "object" && (
                      <span>
                        • {reminder.leadId.firstName} {reminder.leadId.lastName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (soundPlayingRef.current) {
                      stopNotificationSound();
                      soundPlayingRef.current = false;
                    }
                    dismissNotification(reminder);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => handleMarkAsComplete(reminder)}
                  className="text-white bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Mark as Complete
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleNotificationClick(reminder)}
                  className="text-white bg-indigo-500 hover:bg-indigo-600"
                >
                  View Lead
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

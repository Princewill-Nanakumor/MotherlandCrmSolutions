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
import { useAblyAwareRefetchInterval } from "@/hooks/useAblyAwareRefetchInterval";
import { useAblyChannelAttached } from "@/hooks/useAblyChannelAttached";
import {
  REMINDER_DUE_EVENT,
  getTenantChannelName,
} from "@/libs/realtime";
import type { Connection, RealtimeChannel } from "ably";

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
  const [remindersChannel, setRemindersChannel] =
    useState<RealtimeChannel | null>(null);
  const [ablyConnection, setAblyConnection] = useState<Connection | null>(null);
  const soundPlayingRef = useRef<boolean>(false);
  const lastReminderIdsRef = useRef<string>("");

  const remindersChannelReady = useAblyChannelAttached(
    remindersChannel,
    ablyConnection,
  );
  const dueRemindersPollMs = useAblyAwareRefetchInterval(60_000, {
    channelReady: remindersChannelReady,
  });

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

  // Poll for due reminders - pass user's local date/time for correct timezone comparison.
  // Failures must throw (not return []) so previous due IDs stay cached and
  // "newly appeared only" dedupe does not re-alert after a transient error.
  const { data, refetch } = useQuery<Reminder[]>({
    queryKey: ["dueReminders"],
    queryFn: async () => {
      const now = new Date();
      const userDate = formatLocalDateYmd(now);
      const userTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      const url = `/api/reminders/check-due?userDate=${encodeURIComponent(userDate)}&userTime=${encodeURIComponent(userTime)}`;
      const response = await apiCallWithSessionRefresh(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch due reminders: ${response.status}`);
      }
      return (await response.json()) as Reminder[];
    },
    enabled: hasAuthorizedSession(status, session),
    refetchInterval: dueRemindersPollMs,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
    retry: 1,
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
    if (!session?.user?.id || !adminScope) {
      setRemindersChannel(null);
      setAblyConnection(null);
      return;
    }

    let cancelled = false;
    const realtime = getAblyRealtimeClient(session.user.id);
    const channelName = getTenantChannelName(adminScope);
    const channel = realtime.channels.get(channelName);
    const currentUserId = session.user.id;

    const onReminderDue = (message: { data?: unknown }) => {
      const data = (message.data ?? {}) as {
        userId?: string;
        reminderId?: string;
      };
      // Tenant channel is shared — only react to reminders for this user.
      // Auth is the Ably token (tenant channel); this filter is UX only.
      if (data.userId && data.userId !== currentUserId) return;
      void refetch();
    };

    setAblyConnection(realtime.connection);
    setRemindersChannel(channel);

    void (async () => {
      try {
        await channel.attach();
        if (cancelled) {
          void channel.detach().catch(() => undefined);
          return;
        }
        channel.subscribe(REMINDER_DUE_EVENT, onReminderDue);
      } catch {
        // Fallback polling continues; channel attached hook stays false
      }
    })();

    return () => {
      cancelled = true;
      setRemindersChannel(null);
      setAblyConnection(null);
      try {
        channel.unsubscribe(REMINDER_DUE_EVENT, onReminderDue);
      } catch {
        // ignore
      }
      // Shared tenant channel — do not detach/release (dashboard owns it).
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

  // Handle notification updates - only when dueReminders actually changes.
  // At-least-once Ably delivery is fine: we only alert on newly appeared IDs.
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

    const previousIds = new Set(
      lastReminderIdsRef.current.split(",").filter(Boolean),
    );
    const newlyDue = dueReminders.filter((r) => !previousIds.has(r._id));
    lastReminderIdsRef.current = reminderIdsString;

    // Update notifications with a stable reference
    setNotifications([...dueReminders]);

    // Handle sound only when a new due reminder appears
    const newSoundEnabled = newlyDue.filter((r) => r.soundEnabled);
    if (newSoundEnabled.length > 0 && !soundPlayingRef.current) {
      alarmSound.start();
      soundPlayingRef.current = true;
    }

    // Browser notifications: tag=reminderId dedupes OS-side; only create for new IDs
    if (permissionGranted && "Notification" in window) {
      newlyDue.forEach((reminder) => {
        const leadName =
          typeof reminder.leadId === "object"
            ? `${reminder.leadId.firstName} ${reminder.leadId.lastName}`
            : "Lead";

        try {
          const notification = new Notification(`${shortName} reminder: ${reminder.title}`, {
            body: `${reminder.type} - ${leadName}\n${reminder.description || ""}`,
            icon: "/motherland-favicon.svg",
            badge: "/motherland-favicon.svg",
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
  }, [
    dueReminders,
    reminderIdsString,
    permissionGranted,
    router,
    session?.user?.role,
    shortName,
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

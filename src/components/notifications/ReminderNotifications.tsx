// src/components/notifications/ReminderNotifications.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reminder } from "@/types/leads";
import { alarmSound, stopNotificationSound } from "@/lib/notificationSound";
import { formatTime24Hour } from "@/lib/utils";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import {
  formatLocalDateYmd,
  reminderDisplayHeading,
  formatReminderTypeLabel,
} from "@/lib/reminderDueAt";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { getAblyRealtimeClient } from "@/lib/ablyClient";
import { useAblyAwareRefetchInterval } from "@/hooks/useAblyAwareRefetchInterval";
import { useAblyChannelAttached } from "@/hooks/useAblyChannelAttached";
import { REMINDER_DUE_EVENT, getTenantChannelName } from "@/lib/realtime";
import type { Connection, RealtimeChannel } from "ably";

/** Stable fallback so “no data” is not a fresh [] every render (that retriggered useEffect → setState loop). */
const EMPTY_DUE_REMINDERS: Reminder[] = [];

export default function ReminderNotifications() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Reminder[]>([]);
  const [adminScope, setAdminScope] = useState<string | null>(null);
  const [remindersChannel, setRemindersChannel] =
    useState<RealtimeChannel | null>(null);
  const [ablyConnection, setAblyConnection] = useState<Connection | null>(null);
  const [mounted, setMounted] = useState(false);
  const soundPlayingRef = useRef<boolean>(false);

  const remindersChannelReady = useAblyChannelAttached(
    remindersChannel,
    ablyConnection,
  );
  const dueRemindersPollMs = useAblyAwareRefetchInterval(60_000, {
    channelReady: remindersChannelReady,
    healthyMs: 5 * 60 * 1000,
  });

  useEffect(() => {
    setMounted(true);
    alarmSound.armUnlockFromUserGesture();
  }, []);

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
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const dueReminders = data ?? EMPTY_DUE_REMINDERS;

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
        const scopeData = (await scopeResponse.json()) as {
          adminScope?: string;
        };
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

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !adminScope) {
      setRemindersChannel(null);
      setAblyConnection(null);
      return;
    }

    let cancelled = false;
    const realtime = getAblyRealtimeClient(userId);
    const channelName = getTenantChannelName(adminScope);
    const channel = realtime.channels.get(channelName);
    const currentUserId = userId;

    const onReminderDue = (message: { data?: unknown }) => {
      const data = (message.data ?? {}) as {
        userId?: string;
        reminderId?: string;
      };
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
        // Fallback polling continues
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
    };
  }, [session?.user?.id, adminScope, refetch]);

  const reminderIdsString = useMemo(() => {
    if (!dueReminders || dueReminders.length === 0) return "";
    return dueReminders
      .map((r) => r._id)
      .sort()
      .join(",");
  }, [dueReminders]);

  useEffect(() => {
    if (!dueReminders || dueReminders.length === 0) {
      setNotifications((prev) => (prev.length === 0 ? prev : []));
      if (soundPlayingRef.current || alarmSound.isCurrentlyPlaying()) {
        stopNotificationSound();
        soundPlayingRef.current = false;
      }
      return;
    }

    setNotifications([...dueReminders]);

    const shouldBeep = dueReminders.some((reminder) => reminder.soundEnabled);
    if (shouldBeep) {
      alarmSound.start();
      soundPlayingRef.current = true;
    } else if (soundPlayingRef.current || alarmSound.isCurrentlyPlaying()) {
      stopNotificationSound();
      soundPlayingRef.current = false;
    }
  }, [dueReminders, reminderIdsString]);

  const dismissNotification = useCallback(
    async (reminder: Reminder, options?: { persistToDb?: boolean }) => {
      const { persistToDb = true } = options ?? {};

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
          queryClient.refetchQueries({
            queryKey: ["activities", leadId],
            type: "active",
          });
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
          dismissNotification(reminder, { persistToDb: false });
          queryClient.invalidateQueries({ queryKey: ["dueReminders"] });
          queryClient.invalidateQueries({ queryKey: ["activities", leadId] });
          queryClient.refetchQueries({
            queryKey: ["activities", leadId],
            type: "active",
          });
        }
      } catch (error) {
        console.error("Error marking reminder as complete:", error);
      }
    },
    [dismissNotification, queryClient],
  );

  if (!mounted || status === "loading" || status === "unauthenticated") {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div
      className="fixed right-2 top-20 mt-2 space-y-2 max-w-sm z-200"
      onPointerDown={() => {
        if (notifications.some((reminder) => reminder.soundEnabled)) {
          alarmSound.start();
          soundPlayingRef.current = true;
        }
      }}
    >
      {notifications.map((reminder) => (
        <div
          key={reminder._id}
          className="p-4 bg-white rounded-lg border-l-4 border-indigo-500 shadow-lg dark:bg-gray-800 animate-slide-in-right"
        >
          <div className="flex gap-3 items-start">
            <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-shake-bell" />
            </div>
            <div className="flex-1">
              <div className="flex gap-2 justify-between items-start">
                <div>
                  <h4 className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                    {reminderDisplayHeading(
                      reminder.description,
                      reminder.type,
                      reminder.title,
                    )}
                  </h4>
                  <div className="flex gap-2 items-center text-xs text-gray-500 dark:text-gray-400">
                    {formatReminderTypeLabel(reminder.type) ? (
                      <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                        {formatReminderTypeLabel(reminder.type)}
                      </span>
                    ) : null}
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
                  <CheckCircle className="mr-1 w-3 h-3" />
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
    </div>,
    document.body,
  );
}

// src/components/user-management/CallLogsModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Loader2, Calendar, Clock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getAblyRealtimeClient } from "@/libs/ablyClient";
import {
  CALL_LOG_CREATED_EVENT,
  getTenantChannelName,
} from "@/libs/realtime";

interface CallLog {
  id: string;
  userId: string;
  leadId: string | null;
  leadName: string | null;
  leadDisplayId: number | string | null;
  leadCountry: string | null;
  leadSource: string | null;
  leadStatus: { name: string; color: string } | null;
  phoneNumber: string;
  dialer: "microsip" | "zoiper" | "unknown";
  createdAt: string;
  comment: {
    content: string;
    createdAt: string;
  } | null;
}

interface CallLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const formatDateOnly = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatTimeOnly = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Time";
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatDateShort = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) {
    return "Today";
  } else if (targetDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
};

const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

interface DailySummary {
  date: Date;
  dateString: string;
  count: number;
}

const getDialerName = (dialer: string) => {
  switch (dialer) {
    case "microsip":
      return "MicroSIP";
    case "zoiper":
      return "Zoiper";
    default:
      return "Unknown";
  }
};

// Query key factory for call logs (v2 includes comment payload)
export const callLogsKeys = {
  all: ["call-logs"] as const,
  user: (userId: string) => ["call-logs", "user", userId, "v2"] as const,
};

// Fetch call logs function
const fetchCallLogs = async (userId: string): Promise<CallLog[]> => {
  const response = await fetch(`/api/calls/user/${userId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch call logs");
  }
  const data = await response.json();
  return data.callLogs || [];
};

export function CallLogsModal({
  isOpen,
  onClose,
  userId,
  userName,
}: CallLogsModalProps) {
  const [viewMode, setViewMode] = useState<"24h" | "3d">("24h");
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [adminScope, setAdminScope] = useState<string | null>(null);

  // Use React Query to fetch call logs
  const { data: callLogs = [], isLoading: isLoadingLogs } = useQuery<CallLog[]>(
    {
      queryKey: callLogsKeys.user(userId),
      queryFn: () => fetchCallLogs(userId),
      enabled: isOpen && !!userId,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  );

  // Force a fresh pull whenever the modal opens so comments posted after a
  // call (or while the modal was closed) show without a full page reload.
  useEffect(() => {
    if (!isOpen || !userId) return;
    void queryClient.invalidateQueries({
      queryKey: callLogsKeys.user(userId),
      refetchType: "active",
    });
  }, [isOpen, userId, queryClient]);

  useEffect(() => {
    if (!isOpen || !session?.user?.id) return;
    let cancelled = false;

    void (async () => {
      try {
        const scopeResponse = await fetch("/api/ably/scope", {
          method: "GET",
          credentials: "include",
        });
        if (!scopeResponse.ok) return;
        const scopeData = (await scopeResponse.json()) as { adminScope?: string };
        if (!cancelled) {
          setAdminScope(scopeData.adminScope ?? null);
        }
      } catch {
        // Keep modal functional without realtime.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, session?.user?.id]);

  useEffect(() => {
    if (!isOpen || !adminScope || !session?.user?.id || !userId) return;

    const realtime = getAblyRealtimeClient(session.user.id);
    const channelName = getTenantChannelName(adminScope);
    const channel = realtime.channels.get(channelName);
    const onCallLogged = (message: { data?: unknown }) => {
      const data = (message.data ?? {}) as { userId?: string };
      if (data.userId && data.userId !== userId) return;
      queryClient.invalidateQueries({
        queryKey: callLogsKeys.user(userId),
        refetchType: "active",
      });
    };

    let subscribed = false;
    void (async () => {
      try {
        await channel.attach();
        channel.subscribe(CALL_LOG_CREATED_EVENT, onCallLogged);
        subscribed = true;
      } catch {
        // Query still refreshes on open.
      }
    })();

    return () => {
      if (subscribed) {
        channel.unsubscribe(CALL_LOG_CREATED_EVENT, onCallLogged);
      }
      // Shared tenant channel — do not detach/release.
    };
  }, [isOpen, adminScope, session?.user?.id, userId, queryClient]);

  // Filter logs based on view mode (24 hours or 3 days)
  const filteredLogs = useMemo(() => {
    if (viewMode === "24h") {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      return callLogs.filter(
        (log) => new Date(log.createdAt) >= twentyFourHoursAgo,
      );
    }
    return callLogs;
  }, [callLogs, viewMode]);

  // Group calls by day for summary (last 3 days)
  const dailySummary = useMemo(() => {
    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    // Create date buckets for last 3 days
    const summary: DailySummary[] = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      summary.push({
        date,
        dateString: formatDateShort(date),
        count: 0,
      });
    }

    // Count calls for each day
    callLogs.forEach((log) => {
      const logDate = new Date(log.createdAt);
      logDate.setHours(0, 0, 0, 0);

      const daySummary = summary.find((day) => isSameDay(day.date, logDate));
      if (daySummary) {
        daySummary.count++;
      }
    });

    // Sort by date (most recent first)
    return summary.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [callLogs]);

  const total24Hours = useMemo(() => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    return callLogs.filter(
      (log) => new Date(log.createdAt) >= twentyFourHoursAgo,
    ).length;
  }, [callLogs]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex w-full max-h-[90vh] flex-col overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              <PhoneCall className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Call Logs - {userName}
            </DialogTitle>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Track daily call activity. Data refreshes daily and is retained for
            3 days.
          </p>
        </DialogHeader>

        <div className="flex-1 mt-4 overflow-y-auto">
          {isLoadingLogs ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 mb-3 animate-spin brand-icon" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Loading call logs...
              </span>
            </div>
          ) : callLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <PhoneCall className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-30" />
              <p className="font-medium text-gray-500 dark:text-gray-400">
                No call logs found
              </p>
              <p className="max-w-md mt-2 text-xs text-center text-gray-400 dark:text-gray-500">
                This user hasn&apos;t made any calls in the last 3 days. Call
                logs are automatically deleted after 3 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily Summary Section */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-gray-900! dark:text-white!">
                      Daily Call Summary (Last 3 Days)
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {dailySummary.map((day) => (
                    <div
                      key={day.date.toISOString()}
                      className="p-3 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:border-gray-700"
                    >
                      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        {day.dateString}
                      </div>
                      <div className="text-2xl font-bold text-gray-900! dark:text-white!">
                        {day.count}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {day.count === 1 ? "call" : "calls"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Last 24 Hours:
                    </span>
                    <Badge
                      variant="outline"
                      className="dark:border-gray-600 dark:text-white! font-semibold"
                    >
                      {total24Hours} {total24Hours === 1 ? "call" : "calls"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "24h" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("24h")}
                    className="gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Last 24 Hours
                  </Button>
                  <Button
                    variant={viewMode === "3d" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("3d")}
                    className="gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Last 3 Days
                  </Button>
                </div>
                <Badge
                  variant="outline"
                  className="dark:border-gray-600 dark:text-white!"
                >
                  {filteredLogs.length}{" "}
                  {filteredLogs.length === 1 ? "call" : "calls"} shown
                </Badge>
              </div>

              <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                <table className="w-full min-w-full border-collapse">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/50">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-50">
                        Date & Time
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-45">
                        Lead
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-30">
                        Status
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-30">
                        Country
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-30">
                        Source
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-37.5">
                        Phone Number
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-55">
                        Comment
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold text-gray-700! dark:text-gray-300! sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-30">
                        Dialer
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="transition-colors border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white! whitespace-nowrap">
                          <div>
                            <div className="font-medium">
                              {formatDateOnly(log.createdAt)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatTimeOnly(log.createdAt)}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white!">
                          {log.leadName ? (
                            <div>
                              <div className="font-medium">{log.leadName}</div>
                              {log.leadDisplayId && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  ID: {log.leadDisplayId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white! whitespace-nowrap">
                          {log.leadStatus ? (
                            <Badge
                              variant="outline"
                              className="inline-flex items-center gap-1.5 font-medium border"
                              style={{
                                backgroundColor: `${log.leadStatus.color}15`,
                                color: log.leadStatus.color,
                                borderColor: `${log.leadStatus.color}30`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: log.leadStatus.color }}
                              />
                              {log.leadStatus.name}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white! whitespace-nowrap">
                          {log.leadCountry || (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white! whitespace-nowrap">
                          {log.leadSource || (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white! font-mono whitespace-nowrap">
                          {log.phoneNumber}
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-900! dark:text-white! max-w-70">
                          {log.comment?.content ? (
                            <div>
                              <p className="whitespace-pre-wrap wrap-break-word line-clamp-3 font-medium">
                                {log.comment.content}
                              </p>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <div>{formatDateOnly(log.comment.createdAt)}</div>
                                <div>{formatTimeOnly(log.comment.createdAt)}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="dark:border-gray-600 dark:text-white!"
                          >
                            {getDialerName(log.dialer)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// src/components/user-management/CallLogsModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneCall, Loader2, Calendar, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CallLog {
  id: string;
  userId: string;
  leadId: string | null;
  leadName: string | null;
  leadDisplayId: number | null;
  leadCountry: string | null;
  phoneNumber: string;
  dialer: "microsip" | "zoiper" | "unknown";
  createdAt: string;
}

interface CallLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

// Query key factory for call logs
export const callLogsKeys = {
  all: ["call-logs"] as const,
  user: (userId: string) => ["call-logs", "user", userId] as const,
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

  // Use React Query to fetch call logs
  const { data: callLogs = [], isLoading: isLoadingLogs } = useQuery<CallLog[]>(
    {
      queryKey: callLogsKeys.user(userId),
      queryFn: () => fetchCallLogs(userId),
      enabled: isOpen && !!userId, // Only fetch when modal is open and userId exists
      refetchOnMount: "always", // Always refetch when modal opens
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchInterval: isOpen ? 10 * 1000 : false, // Poll every 10 seconds while modal is open to catch new calls
      staleTime: 0, // Always consider data stale so it refetches when modal opens
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    }
  );

  // Filter logs based on view mode (24 hours or 3 days)
  const filteredLogs = useMemo(() => {
    if (viewMode === "24h") {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      return callLogs.filter(
        (log) => new Date(log.createdAt) >= twentyFourHoursAgo
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
      (log) => new Date(log.createdAt) >= twentyFourHoursAgo
    ).length;
  }, [callLogs]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[95vw] sm:!max-w-[90vw] md:!max-w-[85vw] lg:!max-w-[80vw] xl:!max-w-[75vw] 2xl:!max-w-[70vw] max-h-[90vh] overflow-hidden flex flex-col w-full">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Call Logs - {userName}
            </DialogTitle>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Track daily call activity. Data refreshes daily and is retained for
            3 days.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {isLoadingLogs ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Loading call logs...
              </span>
            </div>
          ) : callLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <PhoneCall className="w-16 h-16 mx-auto mb-4 opacity-30 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No call logs found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center max-w-md">
                This user hasn&apos;t made any calls in the last 3 days. Call
                logs are automatically deleted after 3 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily Summary Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold !text-gray-900 dark:!text-white">
                      Daily Call Summary (Last 3 Days)
                    </h3>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {dailySummary.map((day) => (
                    <div
                      key={day.date.toISOString()}
                      className="bg-white dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {day.dateString}
                      </div>
                      <div className="text-2xl font-bold !text-gray-900 dark:!text-white">
                        {day.count}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {day.count === 1 ? "call" : "calls"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Last 24 Hours:
                    </span>
                    <Badge
                      variant="outline"
                      className="dark:border-gray-600 dark:!text-white font-semibold"
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
                  className="dark:border-gray-600 dark:!text-white"
                >
                  {filteredLogs.length}{" "}
                  {filteredLogs.length === 1 ? "call" : "calls"} shown
                </Badge>
              </div>

              <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                <table className="w-full border-collapse min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-6 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-[200px]">
                        Date & Time
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-[180px]">
                        Lead
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-[120px]">
                        Country
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-[150px]">
                        Phone Number
                      </th>
                      <th className="text-left py-3 px-6 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50 min-w-[120px]">
                        Dialer
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-6 text-sm !text-gray-900 dark:!text-white whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-6 text-sm !text-gray-900 dark:!text-white">
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
                        <td className="py-3 px-6 text-sm !text-gray-900 dark:!text-white whitespace-nowrap">
                          {log.leadCountry || (
                            <span className="text-gray-400 dark:text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-sm !text-gray-900 dark:!text-white font-mono whitespace-nowrap">
                          {log.phoneNumber}
                        </td>
                        <td className="py-3 px-6 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="dark:border-gray-600 dark:!text-white"
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

// src/components/user-management/CallLogsModal.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CallLog {
  id: string;
  userId: string;
  leadId: string | null;
  leadName: string | null;
  leadDisplayId: number | null;
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
    hour12: true,
  });
};

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
  // Use React Query to fetch call logs
  const {
    data: callLogs = [],
    isLoading: isLoadingLogs,
  } = useQuery<CallLog[]>({
    queryKey: callLogsKeys.user(userId),
    queryFn: () => fetchCallLogs(userId),
    enabled: isOpen && !!userId, // Only fetch when modal is open and userId exists
    refetchOnMount: "always", // Always refetch when modal opens
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: isOpen ? 10 * 1000 : false, // Poll every 10 seconds while modal is open to catch new calls
    staleTime: 0, // Always consider data stale so it refetches when modal opens
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              Call Logs - {userName}
            </DialogTitle>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Showing call logs from the last 3 days. Logs are automatically deleted after 3 days.
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
                This user hasn&apos;t made any calls in the last 3 days. Call logs are automatically deleted after 3 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="dark:border-gray-600 dark:!text-white">
                  {callLogs.length} {callLogs.length === 1 ? "call" : "calls"} in the last 3 days
                </Badge>
              </div>

              <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50">
                        Date & Time
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50">
                        Lead
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50">
                        Phone Number
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold !text-gray-700 dark:!text-gray-300 sticky top-0 bg-gray-50 dark:bg-gray-800/50">
                        Dialer
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm !text-gray-900 dark:!text-white">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-sm !text-gray-900 dark:!text-white">
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
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm !text-gray-900 dark:!text-white font-mono">
                          {log.phoneNumber}
                        </td>
                        <td className="py-3 px-4">
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

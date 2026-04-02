"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lead } from "@/types/leads";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useStatuses } from "@/context/StatusContext";
import { useSession } from "next-auth/react";

interface LeadStatusProps {
  lead: Lead;
  /** When provided, called after a successful status update so the panel/store can sync the updated lead */
  onLeadUpdated?: (updatedLead: Lead) => Promise<boolean>;
}

type LeadsData =
  | Lead[]
  | {
      data: Lead[];
      total?: number;
      page?: number;
      [key: string]: unknown;
    }
  | {
      leads: Lead[];
      [key: string]: unknown;
    }
  | null
  | undefined;

function hexWithAlpha(hex: string, alpha: string) {
  if (!hex) return "#3b82f6" + alpha;
  if (hex.length === 7) return hex + alpha;
  if (hex.length === 4)
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] + alpha;
  return hex + alpha;
}

const LeadStatus: React.FC<LeadStatusProps> = ({ lead, onLeadUpdated }) => {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const queryClient = useQueryClient();
  const { statuses, isLoading: isLoadingStatuses } = useStatuses();
  const { data: session } = useSession();
  const darkAlpha = "B3";
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const match = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(match.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    match.addEventListener("change", handler);
    return () => match.removeEventListener("change", handler);
  }, []);

  const findStatusByIdOrName = useCallback(
    (statusId: string) => {
      let status = statuses.find((s) => s._id === statusId);
      if (!status) {
        status = statuses.find((s) => s.id === statusId);
      }
      if (!status) {
        status = statuses.find((s) => s.name === statusId);
      }
      return status;
    },
    [statuses],
  );

  const currentStatusObj = findStatusByIdOrName(lead.status);

  const isAdmin = session?.user?.role === "ADMIN";

  const getAssignedToDisplay = useCallback(() => {
    if (!lead.assignedTo) return "Unassigned";
    if (typeof lead.assignedTo === "string") return "Assigned";
    const a = lead.assignedTo as { firstName?: string; lastName?: string };
    if (a.firstName && a.lastName) return `${a.firstName} ${a.lastName}`;
    if (a.firstName) return a.firstName;
    if (a.lastName) return a.lastName;
    return "Assigned";
  }, [lead.assignedTo]);

  const getStatusDisplayName = useCallback(
    (statusId: string) => {
      const status = findStatusByIdOrName(statusId);
      if (status) {
        return status.name;
      }
      // Capitalize fallback status name (e.g., "NEW" -> "New")
      if (statusId) {
        return (
          statusId.charAt(0).toUpperCase() + statusId.slice(1).toLowerCase()
        );
      }
      return "Unknown";
    },
    [findStatusByIdOrName],
  );

  const handleStatusChange = useCallback(
    async (newStatusId: string) => {
      if (!lead._id || lead.status === newStatusId || isUpdating) {
        return;
      }

      const previousStatus = lead.status;
      setIsUpdating(true);

      // Update multiple cache keys to ensure consistency
      const cacheKeysToUpdate = [
        ["leads"], // Generic leads cache
        ["assignedLeads", "list", session?.user?.id || ""], // Assigned leads cache
      ];

      // Optimistic update for all relevant cache keys
      cacheKeysToUpdate.forEach((queryKey) => {
        queryClient.setQueryData(queryKey, (oldData: LeadsData) => {
          if (!oldData) return oldData;

          if (Array.isArray(oldData)) {
            return oldData.map((l: Lead) =>
              l._id === lead._id ? { ...l, status: newStatusId } : l,
            );
          } else if (oldData && typeof oldData === "object") {
            if ("data" in oldData && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: oldData.data.map(
                  (l: Lead) =>
                    l._id === lead._id ? { ...l, status: newStatusId } : l, // ✅ FIXED
                ),
              };
            } else if ("leads" in oldData && Array.isArray(oldData.leads)) {
              return {
                ...oldData,
                leads: oldData.leads.map(
                  (l: Lead) =>
                    l._id === lead._id ? { ...l, status: newStatusId } : l, // ✅ FIXED
                ),
              };
            }
          }
          return oldData;
        });
      });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds

        const response = await fetch(`/api/leads/${lead._id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatusId }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("API call failed", {
            status: response.status,
            error: errorText,
          });
          throw new Error(
            `Failed to update status: ${response.status} - ${errorText}`,
          );
        }

        const updatedLead = await response.json();

        if (updatedLead.status !== newStatusId) {
          console.warn("Status mismatch", {
            expected: newStatusId,
            received: updatedLead.status,
          });
        }

        // ✅ FIXED: Update all cache keys with the full updated lead data
        cacheKeysToUpdate.forEach((queryKey) => {
          queryClient.setQueryData(queryKey, (oldData: LeadsData) => {
            if (!oldData) return oldData;

            if (Array.isArray(oldData)) {
              return oldData.map((l: Lead) =>
                l._id === lead._id ? updatedLead : l,
              );
            } else if (oldData && typeof oldData === "object") {
              if ("data" in oldData && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: oldData.data.map((l: Lead) =>
                    l._id === lead._id ? updatedLead : l,
                  ),
                };
              } else if ("leads" in oldData && Array.isArray(oldData.leads)) {
                return {
                  ...oldData,
                  leads: oldData.leads.map((l: Lead) =>
                    l._id === lead._id ? updatedLead : l,
                  ),
                };
              }
            }
            return oldData;
          });
        });

        // Invalidate activities query
        queryClient
          .invalidateQueries({
            queryKey: ["activities", lead._id],
            exact: false,
          })
          .catch((error) => {
            console.error("Error invalidating activities query:", error);
          });

        // ✅ FIX: Invalidate leads query to ensure table re-renders with updated status
        // This ensures the table syncs properly after status updates
        queryClient
          .invalidateQueries({
            queryKey: ["leads"],
            exact: false,
          })
          .catch((error) => {
            console.error("Error invalidating leads query:", error);
          });

        // Notify parent so the details panel and selectedLead store stay in sync
        if (onLeadUpdated) {
          onLeadUpdated(updatedLead).catch((err) =>
            console.error("Error notifying parent of status update:", err),
          );
        }

        toast({
          title: "Status updated",
          description: `Lead status changed successfully.`,
          variant: "success",
        });
      } catch (error) {
        console.error("Status update failed, rolling back", {
          leadId: lead._id,
          fromStatus: previousStatus,
          attemptedStatus: newStatusId,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        // ✅ FIXED: Rollback all cache keys on error
        cacheKeysToUpdate.forEach((queryKey) => {
          queryClient.setQueryData(queryKey, (oldData: LeadsData) => {
            if (!oldData) return oldData;

            if (Array.isArray(oldData)) {
              return oldData.map((l: Lead) =>
                l._id === lead._id ? { ...l, status: previousStatus } : l,
              );
            } else if (oldData && typeof oldData === "object") {
              if ("data" in oldData && Array.isArray(oldData.data)) {
                return {
                  ...oldData,
                  data: oldData.data.map((l: Lead) =>
                    l._id === lead._id ? { ...l, status: previousStatus } : l,
                  ),
                };
              } else if ("leads" in oldData && Array.isArray(oldData.leads)) {
                return {
                  ...oldData,
                  leads: oldData.leads.map((l: Lead) =>
                    l._id === lead._id ? { ...l, status: previousStatus } : l,
                  ),
                };
              }
            }
            return oldData;
          });
        });

        const errorMessage =
          error instanceof Error ? error.message : "Failed to update status";

        // Check if this was an abort error (timeout)
        const isAbortError =
          error instanceof Error &&
          (error.name === "AbortError" ||
            error.message.includes("aborted") ||
            error.message.includes("SIGNAL ABORTED"));

        if (isAbortError) {
          toast({
            title: "Request timed out",
            description:
              "The status update is taking longer than expected. Please check if the change was applied and try again if needed.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [
      lead._id,
      lead.status,
      queryClient,
      toast,
      isUpdating,
      session?.user?.id,
      onLeadUpdated,
    ],
  );

  const currentStatusColor = currentStatusObj?.color || "#3b82f6";
  const triggerBg = isDark
    ? hexWithAlpha(currentStatusColor, darkAlpha)
    : currentStatusColor;
  const triggerTextColor = "#fff";
  const maxHeight = statuses.length > 7 ? "280px" : "auto";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <style jsx>{`
        .smooth-scroll-content {
          scroll-behavior: smooth;
          scrollbar-width: thin;
          scrollbar-color: ${isDark ? "#6b7280 #374151" : "#cbd5e1 #f1f5f9"};
        }

        .smooth-scroll-content::-webkit-scrollbar {
          width: 8px;
        }

        .smooth-scroll-content::-webkit-scrollbar-track {
          background: ${isDark ? "#374151" : "#f1f5f9"};
          border-radius: 4px;
        }

        .smooth-scroll-content::-webkit-scrollbar-thumb {
          background: ${isDark ? "#6b7280" : "#94a3b8"};
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .smooth-scroll-content::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? "#9ca3af" : "#94a3b8"};
        }

        .status-item {
          transition: all 0.2s ease-in-out;
        }

        .status-item:hover {
          transform: translateX(2px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      <div className="flex-1">
        <p className="text-sm text-gray-500! dark:text-gray-400! mb-1">
          Status
        </p>
        {isLoadingStatuses ? (
          <div className="flex items-center">
            <Loader2 className="w-4 h-4 text-gray-500 animate-spin dark:text-gray-400" />
          </div>
        ) : (
          <Select
            value={lead.status}
            onValueChange={handleStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger
              className="transition-all duration-200 ease-in-out border rounded-md cursor-pointer w-50 dark:border-gray-600"
              style={{
                backgroundColor: triggerBg,
                color: triggerTextColor,
                borderColor: currentStatusColor,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 transition-all duration-200 ease-in-out rounded-full"
                  style={{
                    backgroundColor: "#fff",
                    border: `2px solid ${currentStatusColor}`,
                  }}
                />
                <span
                  className="font-medium"
                  style={{
                    color: triggerTextColor,
                  }}
                >
                  {getStatusDisplayName(lead.status)}
                </span>
                {isUpdating && (
                  <Loader2
                    className="w-3 h-3 ml-auto animate-spin"
                    style={{ color: triggerTextColor }}
                  />
                )}
              </div>
            </SelectTrigger>
            <SelectContent
              className={`border-gray-300 dark:border-gray-600 ${
                statuses.length > 7 ? "smooth-scroll-content" : ""
              }`}
              style={{
                maxHeight: maxHeight,
                overflowY: statuses.length > 7 ? "auto" : "visible",
                scrollBehavior: "smooth",
              }}
            >
              {[...statuses]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((status) => {
                  const statusColor = status.color || "#3b82f6";
                  const itemBg = isDark
                    ? hexWithAlpha(statusColor, darkAlpha)
                    : statusColor;
                  const textColor = "#fff";
                  return (
                    <SelectItem
                      key={status._id || status.id || `status-${status.name}`}
                      value={status._id || status.id || ""}
                      className="my-1 font-medium transition-all duration-200 ease-in-out rounded-md cursor-pointer status-item"
                      style={{
                        backgroundColor: itemBg,
                        color: textColor,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 transition-all duration-200 ease-in-out rounded-full"
                          style={{
                            backgroundColor: "#fff",
                            border: `2px solid ${statusColor}`,
                          }}
                        />
                        <span style={{ color: textColor }}>{status.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        )}
      </div>
      {/* Assigned-to badge: show only on shorter viewports (e.g. laptop); hide on tall desktop screens */}
      {isAdmin && lead.assignedTo && (
        <>
          <style>{`.assigned-badge-hide-on-tall { display: flex; } @media (min-height: 1200px) { .assigned-badge-hide-on-tall { display: none !important; } }`}</style>
          <div className="assigned-badge-hide-on-tall items-center gap-1.5 shrink-0 flex">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
              <User className="h-3.5 w-3.5" />
              <span className="text-gray-500 dark:text-gray-400">
                Assigned to
              </span>{" "}
              {getAssignedToDisplay()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadStatus;

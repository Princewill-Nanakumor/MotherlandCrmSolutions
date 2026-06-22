// src/components/leads/leadDetailsPanel/LeadStatus.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Lead } from "@/types/leads";
import { User as UserType } from "@/types/user.types";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useStatuses } from "@/context/StatusContext";
import { useSession } from "next-auth/react";
import { useLeadStatusMutation } from "@/hooks/leads/useLeadStatusMutation";
import {
  getLeadAssignedDisplayName,
  isLeadAssignedToActiveUser,
} from "@/lib/leadAssignmentDisplay";

interface LeadStatusProps {
  lead: Lead;
  users?: UserType[];
  /** When provided, called after a successful status update so the panel/store can sync the updated lead */
  onLeadUpdated?: (updatedLead: Lead) => Promise<boolean>;
}

function hexWithAlpha(hex: string, alpha: string) {
  if (!hex) return "#3b82f6" + alpha;
  if (hex.length === 7) return hex + alpha;
  if (hex.length === 4)
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] + alpha;
  return hex + alpha;
}

const LeadStatus: React.FC<LeadStatusProps> = ({ lead, users, onLeadUpdated }) => {
  const { toast } = useToast();
  const { statuses, isLoading: isLoadingStatuses } = useStatuses();
  const { data: session } = useSession();
  const darkAlpha = "B3";
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const compute = () => setIsDark(root.classList.contains("dark"));
    compute();
    const observer = new MutationObserver(compute);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
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

  const assignedDisplayName = getLeadAssignedDisplayName(lead.assignedTo, users);
  const showAssignedBadge =
    isAdmin && isLeadAssignedToActiveUser(lead.assignedTo, users);

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

  const { isUpdating, handleStatusChange } = useLeadStatusMutation({
    lead,
    getStatusDisplayName,
    onLeadUpdated,
    toast,
  });

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
      {showAssignedBadge && (
        <>
          <style>{`.assigned-badge-hide-on-tall { display: flex; } @media (min-height: 1200px) { .assigned-badge-hide-on-tall { display: none !important; } }`}</style>
          <div className="assigned-badge-hide-on-tall items-center gap-1.5 shrink-0 flex">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800">
              <User className="h-3.5 w-3.5" />
              <span className="text-gray-500 dark:text-gray-400">
                Assigned to
              </span>{" "}
              {assignedDisplayName}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default LeadStatus;

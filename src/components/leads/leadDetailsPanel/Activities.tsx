// src/components/leads/leadDetailsPanel/Activities.tsx
"use client";

import React, { FC, useCallback } from "react";
import {
  Calendar,
  Loader2,
  User,
  MessageSquare,
  ArrowRight,
  Activity as ActivityIcon,
  Clock,
  CheckCircle,
  XCircle,
  VolumeX,
  Volume2,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { Activity, Status } from "@/types/leads";
import { formatTime24Hour } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface ActivitiesProps {
  leadId: string;
}

const Activities: FC<ActivitiesProps> = ({ leadId }) => {
  const { toast } = useToast();

  // Fetch statuses
  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ["statuses"],
    queryFn: async (): Promise<Status[]> => {
      const response = await fetch("/api/statuses");
      if (!response.ok) {
        throw new Error("Failed to fetch statuses");
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch activities
  const {
    data: activities = [],
    isLoading,
    error,
  } = useQuery<Activity[]>({
    queryKey: ["activities", leadId],
    queryFn: async (): Promise<Activity[]> => {
      console.log("=== FETCHING ACTIVITIES WITH REACT QUERY ===");
      console.log("Lead ID:", leadId);

      const response = await fetch(`/api/leads/${leadId}/activities`);

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("Raw activities response:", responseData);

      const activitiesData = Array.isArray(responseData) ? responseData : [];
      return activitiesData;
    },
    enabled: !!leadId,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.error("Activities fetch error:", error);
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  // Handle error - now using imported React
  React.useEffect(() => {
    if (error) {
      console.error("Activities query error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch activities",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const getActivityIcon = (type: Activity["type"]) => {
    const iconSizeClass = "w-5 h-5";
    switch (type) {
      case "STATUS_CHANGE":
        return (
          <ArrowRight
            className={`${iconSizeClass} text-blue-600 dark:text-blue-400`}
          />
        );
      case "ASSIGNMENT":
        return (
          <User
            className={`${iconSizeClass} text-green-600 dark:text-green-400`}
          />
        );
      case "COMMENT":
        return (
          <MessageSquare
            className={`${iconSizeClass} text-purple-600 dark:text-purple-400`}
          />
        );
      case "LEAD_CREATED":
        return (
          <Calendar
            className={`${iconSizeClass} text-orange-600 dark:text-orange-400`}
          />
        );
      case "CREATE":
        return (
          <Calendar
            className={`${iconSizeClass} text-green-600 dark:text-green-400`}
          />
        );
      case "UPDATE":
        return (
          <ArrowRight
            className={`${iconSizeClass} text-blue-600 dark:text-blue-400`}
          />
        );
      case "DELETE":
        return (
          <ActivityIcon
            className={`${iconSizeClass} text-red-600 dark:text-red-400`}
          />
        );
      case "IMPORT":
        return (
          <ActivityIcon
            className={`${iconSizeClass} text-purple-600 dark:text-purple-400`}
          />
        );
      case "REMINDER_CREATED":
        return (
          <Clock
            className={`${iconSizeClass} text-blue-500 dark:text-blue-400`}
          />
        );
      case "REMINDER_UPDATED":
        return (
          <Edit
            className={`${iconSizeClass} text-blue-500 dark:text-blue-400`}
          />
        );
      case "REMINDER_DELETED":
        return (
          <Trash2
            className={`${iconSizeClass} text-red-500 dark:text-red-400`}
          />
        );
      case "REMINDER_COMPLETED":
        return (
          <CheckCircle
            className={`${iconSizeClass} text-green-500 dark:text-green-400`}
          />
        );
      case "REMINDER_SNOOZED":
        return (
          <Clock
            className={`${iconSizeClass} text-yellow-500 dark:text-yellow-400`}
          />
        );
      case "REMINDER_DISMISSED":
        return (
          <XCircle
            className={`${iconSizeClass} text-gray-500 dark:text-gray-400`}
          />
        );
      case "REMINDER_MUTED":
        return (
          <VolumeX
            className={`${iconSizeClass} text-gray-500 dark:text-gray-400`}
          />
        );
      case "REMINDER_UNMUTED":
        return (
          <Volume2
            className={`${iconSizeClass} text-blue-500 dark:text-blue-400`}
          />
        );
      default:
        return (
          <ActivityIcon
            className={`${iconSizeClass} text-gray-600 dark:text-gray-400`}
          />
        );
    }
  };

  const getActivityBackground = (type: Activity["type"]) => {
    switch (type) {
      case "STATUS_CHANGE":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "ASSIGNMENT":
        return "bg-green-100 dark:bg-green-900/30";
      case "COMMENT":
        return "bg-purple-100 dark:bg-purple-900/30";
      case "LEAD_CREATED":
        return "bg-orange-100 dark:bg-orange-900/30";
      case "CREATE":
        return "bg-green-100 dark:bg-green-900/30";
      case "UPDATE":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "DELETE":
        return "bg-red-100 dark:bg-red-900/30";
      case "IMPORT":
        return "bg-purple-100 dark:bg-purple-900/30";
      case "REMINDER_CREATED":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "REMINDER_UPDATED":
        return "bg-blue-100 dark:bg-blue-900/30";
      case "REMINDER_DELETED":
        return "bg-red-100 dark:bg-red-900/30";
      case "REMINDER_COMPLETED":
        return "bg-green-100 dark:bg-green-900/30";
      case "REMINDER_SNOOZED":
        return "bg-yellow-100 dark:bg-yellow-900/30";
      case "REMINDER_DISMISSED":
        return "bg-gray-100 dark:bg-gray-900/30";
      case "REMINDER_MUTED":
        return "bg-gray-100 dark:bg-gray-900/30";
      case "REMINDER_UNMUTED":
        return "bg-blue-100 dark:bg-blue-900/30";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  };

  // Get status by name or ID
  const getStatusByName = useCallback(
    (statusName: string): Status | null => {
      return (
        statuses.find(
          (status) => status.name === statusName || status._id === statusName
        ) || null
      );
    },
    [statuses]
  );

  // Get status color
  const getStatusColor = useCallback(
    (statusName: string): string => {
      const status = getStatusByName(statusName);
      return status?.color || "#3B82F6";
    },
    [getStatusByName]
  );

  // Updated to handle both Date objects and strings
  const formatDateTime = (dateInput: Date | string) => {
    try {
      const date =
        typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      return format(date, "d MMM , yyyy 'at' h:mm a");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Helper function to get user display name
  const getUserDisplayName = (createdBy: Activity["createdBy"]): string => {
    if (
      typeof createdBy === "object" &&
      createdBy?.firstName &&
      createdBy?.lastName
    ) {
      return `${createdBy.firstName} ${createdBy.lastName}`;
    }
    if (typeof createdBy === "string") {
      return `User ${createdBy.substring(0, 8)}`;
    }
    return "Unknown User";
  };

  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case "COMMENT":
        if (activity.description === "Added a comment")
          return "added a comment";
        if (activity.description === "Edited a comment")
          return "edited a comment";
        if (activity.description === "Deleted a comment")
          return "deleted a comment";
        return activity.description;
      case "STATUS_CHANGE":
        return "changed status";
      case "ASSIGNMENT":
        // Check if this is an assignment or unassignment
        const hasAssignedTo =
          activity.metadata?.assignedTo &&
          (typeof activity.metadata.assignedTo === "object" ||
            typeof activity.metadata.assignedTo === "string");

        const hasAssignedFrom =
          activity.metadata?.assignedFrom &&
          (typeof activity.metadata.assignedFrom === "object" ||
            typeof activity.metadata.assignedFrom === "string");

        if (hasAssignedTo && hasAssignedFrom) {
          return "reassigned this lead to ";
        } else if (hasAssignedTo) {
          return "assigned this lead to ";
        } else if (hasAssignedFrom) {
          return "unassigned this lead from ";
        }
        return "changed assignment";
      case "LEAD_CREATED":
        return "created this lead";
      case "CREATE":
        return "created";
      case "UPDATE":
        return "updated";
      case "DELETE":
        return "deleted";
      case "IMPORT":
        return "imported";
      default:
        return activity.description;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500 dark:text-gray-500" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 !text-gray-500 dark:!text-gray-400">
        <ActivityIcon className="w-12 h-12 mx-auto mb-4 !text-gray-300 dark:!text-gray-600" />
        <p className="text-lg font-medium !text-gray-700 dark:!text-gray-300">
          No Activities Yet
        </p>
        <p className="text-sm !text-gray-500 dark:!text-gray-400">
          Activities will appear here when changes are made to this lead.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 flex flex-col bg-gray-50 dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      style={{ height: "100%" }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 border border-gray-100 dark:border-gray-700 flex-1 min-h-0 flex flex-col">
        <h3 className="text-lg font-semibold !text-gray-800 dark:!text-white mb-4">
          Activity Log ({activities.length})
        </h3>
        <div
          className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg p-4 space-y-4 border border-gray-200 dark:border-gray-700 shadow-inner"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#9333ea #f3f4f6",
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f3f4f6;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb {
              background: #6366f1;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #4f46e5;
            }
            .dark div::-webkit-scrollbar-track {
              background: #374151;
            }
            .dark div::-webkit-scrollbar-thumb {
              background: #6366f1;
            }
            .dark div::-webkit-scrollbar-thumb:hover {
              background: #4f46e5;
            }
          `}</style>
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="p-4 rounded-md bg-gray-100 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex gap-3">
                <div
                  className={`p-2.5 rounded-full ${getActivityBackground(activity.type)} shrink-0`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
                      <span className="text-sm font-normal !text-gray-700 dark:!text-gray-200">
                        {getUserDisplayName(activity.createdBy)}
                      </span>
                      <span className="text-sm font-semibold !text-gray-900 dark:!text-white leading-relaxed">
                        {getActivityDescription(activity)}

                        {/* Specific rendering for STATUS_CHANGE with real colors */}
                        {activity.type === "STATUS_CHANGE" && (
                          <>
                            {activity.metadata?.oldStatus &&
                              activity.metadata?.newStatus && (
                                <>
                                  {" "}
                                  <span
                                    className="inline-block font-normal px-2 py-1 rounded-md text-xs"
                                    style={{
                                      backgroundColor: `${getStatusColor(activity.metadata.oldStatus)}15`,
                                      color: getStatusColor(
                                        activity.metadata.oldStatus
                                      ),
                                      border: `1px solid ${getStatusColor(activity.metadata.oldStatus)}30`,
                                    }}
                                  >
                                    {activity.metadata.oldStatus}
                                  </span>
                                  <ArrowRight className="inline w-3 h-3 mx-1 text-gray-500 dark:text-gray-400" />
                                  <span
                                    className="inline-block font-normal px-2 py-1 rounded-md text-xs"
                                    style={{
                                      backgroundColor: `${getStatusColor(activity.metadata.newStatus)}15`,
                                      color: getStatusColor(
                                        activity.metadata.newStatus
                                      ),
                                      border: `1px solid ${getStatusColor(activity.metadata.newStatus)}30`,
                                    }}
                                  >
                                    {activity.metadata.newStatus}
                                  </span>
                                </>
                              )}
                          </>
                        )}

                        {/* Specific rendering for ASSIGNMENT */}
                        {activity.type === "ASSIGNMENT" && (
                          <>
                            {activity.metadata?.assignedTo && (
                              <span className="font-normal !text-gray-700 dark:!text-gray-200">
                                {typeof activity.metadata.assignedTo ===
                                  "object" &&
                                activity.metadata.assignedTo.firstName
                                  ? `${activity.metadata.assignedTo.firstName} ${activity.metadata.assignedTo.lastName}`
                                  : typeof activity.metadata.assignedTo ===
                                      "string"
                                    ? `User ${activity.metadata.assignedTo.substring(0, 8)}`
                                    : "Unknown User"}
                              </span>
                            )}
                            {activity.metadata?.assignedFrom &&
                              !activity.metadata?.assignedTo && (
                                <span className="font-normal !text-gray-700 dark:!text-gray-200">
                                  {typeof activity.metadata.assignedFrom ===
                                    "object" &&
                                  activity.metadata.assignedFrom.firstName
                                    ? `${activity.metadata.assignedFrom.firstName} ${activity.metadata.assignedFrom.lastName}`
                                    : typeof activity.metadata.assignedFrom ===
                                        "string"
                                      ? `User ${activity.metadata.assignedFrom.substring(0, 8)}`
                                      : "Unknown User"}
                                </span>
                              )}
                          </>
                        )}
                      </span>
                    </div>

                    <span className="text-xs !text-gray-600 dark:!text-gray-400 font-sans bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-md border border-gray-200 dark:border-gray-600 whitespace-nowrap shrink-0">
                      {formatDateTime(activity.createdAt)}
                    </span>
                  </div>

                  {activity.metadata?.commentContent && (
                    <div className="mt-2 text-sm !text-gray-600 dark:!text-gray-300">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border-l-4 border-purple-300 dark:border-purple-500 shadow-sm">
                        <span className="font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide text-xs mr-1">
                          Comment:
                        </span>{" "}
                        <span className="italic !text-gray-800 dark:!text-white leading-relaxed">
                          &ldquo;{activity.metadata.commentContent}&rdquo;
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Display reminder-specific metadata */}
                  {activity.type.startsWith("REMINDER_") &&
                    activity.metadata && (
                      <div className="mt-2 text-sm !text-gray-600 dark:!text-gray-300">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border-l-4 border-blue-300 dark:border-blue-500 shadow-sm">
                          <span className="font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide text-xs mr-1">
                            Reminder Details:
                          </span>
                          <div className="mt-1 space-y-1">
                            {activity.metadata.reminderTitle && (
                              <div className="text-xs">
                                <span className="font-medium">Title:</span>{" "}
                                <span className="text-gray-700 dark:text-gray-200">
                                  {activity.metadata.reminderTitle}
                                </span>
                              </div>
                            )}
                            {activity.metadata.reminderType && (
                              <div className="text-xs">
                                <span className="font-medium">Type:</span>{" "}
                                <span className="text-gray-700 dark:text-gray-200">
                                  {activity.metadata.reminderType}
                                </span>
                              </div>
                            )}
                            {activity.metadata.reminderDate &&
                              activity.metadata.reminderTime && (
                                <div className="text-xs">
                                  <span className="font-medium">Due:</span>{" "}
                                  <span className="text-gray-700 dark:text-gray-200">
                                    {new Date(
                                      activity.metadata.reminderDate
                                    ).toLocaleDateString()}{" "}
                                    at{" "}
                                    {formatTime24Hour(
                                      activity.metadata.reminderTime
                                    )}
                                  </span>
                                </div>
                              )}
                            {activity.metadata.snoozedUntil && (
                              <div className="text-xs">
                                <span className="font-medium">
                                  Snoozed Until:
                                </span>{" "}
                                <span className="text-yellow-600 dark:text-yellow-400">
                                  {new Date(
                                    activity.metadata.snoozedUntil
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {activity.metadata.completedAt && (
                              <div className="text-xs">
                                <span className="font-medium">
                                  Completed At:
                                </span>{" "}
                                <span className="text-green-600 dark:text-green-400">
                                  {new Date(
                                    activity.metadata.completedAt
                                  ).toLocaleString()}
                                </span>
                              </div>
                            )}
                            {activity.metadata.soundEnabled !== undefined && (
                              <div className="text-xs">
                                <span className="font-medium">Sound:</span>{" "}
                                <span
                                  className={`${activity.metadata.soundEnabled ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}
                                >
                                  {activity.metadata.soundEnabled
                                    ? "Enabled"
                                    : "Muted"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Display additional metadata for other activity types */}
                  {activity.metadata?.changes &&
                    activity.metadata.changes.length > 0 && (
                      <div className="mt-2 text-sm !text-gray-600 dark:!text-gray-300">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border-l-4 border-blue-300 dark:border-blue-500 shadow-sm">
                          <span className="font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide text-xs mr-1">
                            Changes:
                          </span>
                          <div className="mt-1 space-y-1">
                            {activity.metadata.changes.map((change, index) => (
                              <div key={index} className="text-xs">
                                <span className="font-medium">
                                  {change.field}:
                                </span>{" "}
                                <span className="text-gray-500">
                                  {change.oldValue || "empty"}
                                </span>{" "}
                                <ArrowRight className="inline w-2 h-2 mx-1" />{" "}
                                <span className="text-gray-700 dark:text-gray-200">
                                  {change.newValue || "empty"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Activities;

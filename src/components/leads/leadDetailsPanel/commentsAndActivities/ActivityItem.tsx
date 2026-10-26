// src/components/leads/leadDetailsPanel/commentsAndActivities/ActivityItem.tsx
"use client";

import { FC } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Activity, Status } from "@/types/leads";
import {
  getActivityIcon,
  getActivityBackground,
  getActivityDescription,
  getStatusColor,
  getStatusDisplayLabel,
  ContactChangesDetails,
  ReminderActivityDetails,
} from "./ActivityHelpers";
import { formatDate, getUserDisplayName } from "./utils";
import { cn } from "@/lib/utils";
import { DELETE_ICON_BUTTON_CLASS } from "@/lib/actionIconButtonStyles";

interface ActivityItemProps {
  activity: Activity;
  statuses: Status[];
  isAdmin?: boolean;
  isDeleting?: boolean;
  isDeleteDisabled?: boolean;
  onDelete?: (activityId: string) => void;
}

export const ActivityItem: FC<ActivityItemProps> = ({
  activity,
  statuses,
  isAdmin = false,
  isDeleting = false,
  isDeleteDisabled = false,
  onDelete,
}) => {
  return (
    <div className="group p-4 rounded-md bg-gray-100 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
      <div className="flex gap-3">
        <div
          className={`p-2.5 rounded-full ${getActivityBackground(activity.type)} shrink-0`}
        >
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1 flex-wrap min-w-0 flex-1">
              <span className="text-xs font-normal text-gray-700! dark:text-gray-200!">
                {getUserDisplayName(activity.createdBy)}
              </span>
              <span className="text-sm font-semibold text-gray-900! dark:text-white! leading-relaxed">
                {getActivityDescription(activity)}

                {/* Status change display */}
                {activity.type === "STATUS_CHANGE" && (
                  <>
                    {activity.metadata?.oldStatus &&
                      activity.metadata?.newStatus && (
                        <>
                          {" "}
                          <span
                            className="inline-block font-normal px-2 py-1 rounded-md text-xs"
                            style={{
                              backgroundColor: `${getStatusColor(statuses, activity.metadata.oldStatus)}15`,
                              color: getStatusColor(
                                statuses,
                                activity.metadata.oldStatus
                              ),
                              border: `1px solid ${getStatusColor(statuses, activity.metadata.oldStatus)}30`,
                            }}
                          >
                            {getStatusDisplayLabel(
                              statuses,
                              activity.metadata.oldStatus,
                            )}
                          </span>
                          <ArrowRight className="inline w-3 h-3 mx-1 text-gray-500! dark:text-gray-400!" />
                          <span
                            className="inline-block font-normal px-2 py-1 rounded-md text-xs"
                            style={{
                              backgroundColor: `${getStatusColor(statuses, activity.metadata.newStatus)}15`,
                              color: getStatusColor(
                                statuses,
                                activity.metadata.newStatus
                              ),
                              border: `1px solid ${getStatusColor(statuses, activity.metadata.newStatus)}30`,
                            }}
                          >
                            {getStatusDisplayLabel(
                              statuses,
                              activity.metadata.newStatus,
                            )}
                          </span>
                        </>
                      )}
                  </>
                )}

                {/* Assignment display */}
                {activity.type === "ASSIGNMENT" && (
                  <>
                    {activity.metadata?.assignedTo && (
                      <span className="font-normal text-gray-700! dark:text-gray-200!">
                        {typeof activity.metadata.assignedTo === "object" &&
                        activity.metadata.assignedTo.firstName
                          ? `${activity.metadata.assignedTo.firstName} ${activity.metadata.assignedTo.lastName}`
                          : typeof activity.metadata.assignedTo === "string"
                            ? `User ${activity.metadata.assignedTo.substring(0, 8)}`
                            : "Unknown User"}
                      </span>
                    )}
                    {activity.metadata?.assignedFrom &&
                      !activity.metadata?.assignedTo && (
                        <span className="font-normal text-gray-700! dark:text-gray-200!">
                          {typeof activity.metadata.assignedFrom === "object" &&
                          activity.metadata.assignedFrom.firstName
                            ? `${activity.metadata.assignedFrom.firstName} ${activity.metadata.assignedFrom.lastName}`
                            : typeof activity.metadata.assignedFrom === "string"
                              ? `User ${activity.metadata.assignedFrom.substring(0, 8)}`
                              : "Unknown User"}
                        </span>
                      )}
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-gray-600! dark:text-gray-400! bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-md border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                {formatDate(activity.createdAt)}
              </span>
              {isAdmin && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "transition-opacity duration-200",
                    DELETE_ICON_BUTTON_CLASS,
                    isDeleting
                      ? "opacity-100"
                      : "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                  )}
                  onClick={() => onDelete(activity._id)}
                  disabled={isDeleting || isDeleteDisabled}
                  title="Delete activity"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Reminder metadata */}
          {activity.type.startsWith("REMINDER_") && activity.metadata && (
            <ReminderActivityDetails metadata={activity.metadata} />
          )}

          <ContactChangesDetails changes={activity.metadata?.changes} />
        </div>
      </div>
    </div>
  );
};

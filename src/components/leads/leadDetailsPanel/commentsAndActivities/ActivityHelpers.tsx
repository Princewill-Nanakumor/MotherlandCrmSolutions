// src/components/leads/leadDetailsPanel/commentsAndActivities/ActivityHelpers.tsx
"use client";

import React from "react";
import {
  ArrowRight,
  User,
  Calendar,
  Activity as ActivityIcon,
  Clock,
  CheckCircle,
  XCircle,
  VolumeX,
  Volume2,
  Edit,
  Trash2,
} from "lucide-react";
import type { Activity, Status } from "@/types/leads";

export function getActivityIcon(type: Activity["type"]): React.ReactElement {
  const iconSizeClass = "w-5 h-5";
  switch (type) {
    case "STATUS_CHANGE":
      return (
        <ArrowRight
          className={`${iconSizeClass} text-blue-600! dark:text-blue-400!`}
        />
      );
    case "ASSIGNMENT":
      return (
        <User
          className={`${iconSizeClass} text-green-600! dark:text-green-400!`}
        />
      );
    case "LEAD_CREATED":
      return (
        <Calendar
          className={`${iconSizeClass} text-orange-600! dark:text-orange-400!`}
        />
      );
    case "CREATE":
      return (
        <Calendar
          className={`${iconSizeClass} text-green-600! dark:text-green-400!`}
        />
      );
    case "UPDATE":
      return (
        <ArrowRight
          className={`${iconSizeClass} text-blue-600! dark:text-blue-400!`}
        />
      );
    case "DELETE":
      return (
        <ActivityIcon
          className={`${iconSizeClass} text-red-600! dark:text-red-400!`}
        />
      );
    case "IMPORT":
      return (
        <ActivityIcon
          className={`${iconSizeClass} brand-icon`}
        />
      );
    case "REMINDER_CREATED":
      return (
        <Clock
          className={`${iconSizeClass} text-blue-500! dark:text-blue-400!`}
        />
      );
    case "REMINDER_UPDATED":
      return (
        <Edit
          className={`${iconSizeClass} text-blue-500! dark:text-blue-400!`}
        />
      );
    case "REMINDER_DELETED":
      return (
        <Trash2
          className={`${iconSizeClass} text-red-500! dark:text-red-400!`}
        />
      );
    case "REMINDER_COMPLETED":
      return (
        <CheckCircle
          className={`${iconSizeClass} text-green-500! dark:text-green-400!`}
        />
      );
    case "REMINDER_SNOOZED":
      return (
        <Clock
          className={`${iconSizeClass} text-yellow-500! dark:text-yellow-400!`}
        />
      );
    case "REMINDER_DISMISSED":
      return (
        <XCircle
          className={`${iconSizeClass} text-gray-500! dark:text-gray-400!`}
        />
      );
    case "REMINDER_MUTED":
      return (
        <VolumeX
          className={`${iconSizeClass} text-gray-500! dark:text-gray-400!`}
        />
      );
    case "REMINDER_UNMUTED":
      return (
        <Volume2
          className={`${iconSizeClass} text-blue-500! dark:text-blue-400!`}
        />
      );
    default:
      return (
        <ActivityIcon
          className={`${iconSizeClass} text-gray-600! dark:text-gray-400!`}
        />
      );
  }
}

export function getActivityBackground(type: Activity["type"]): string {
  switch (type) {
    case "STATUS_CHANGE":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "ASSIGNMENT":
      return "bg-green-100 dark:bg-green-900/30";
    case "LEAD_CREATED":
      return "bg-orange-100 dark:bg-orange-900/30";
    case "CREATE":
      return "bg-green-100 dark:bg-green-900/30";
    case "UPDATE":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "DELETE":
      return "bg-red-100 dark:bg-red-900/30";
    case "IMPORT":
      return "bg-[color-mix(in_srgb,var(--brand-from)_14%,white)] dark:bg-[color-mix(in_srgb,var(--brand-from)_22%,#111827)]";
    case "REMINDER_CREATED":
    case "REMINDER_UPDATED":
    case "REMINDER_UNMUTED":
      return "bg-blue-100 dark:bg-blue-900/30";
    case "REMINDER_DELETED":
      return "bg-red-100 dark:bg-red-900/30";
    case "REMINDER_COMPLETED":
      return "bg-green-100 dark:bg-green-900/30";
    case "REMINDER_SNOOZED":
      return "bg-yellow-100 dark:bg-yellow-900/30";
    case "REMINDER_DISMISSED":
    case "REMINDER_MUTED":
      return "bg-gray-100 dark:bg-gray-900/30";
    default:
      return "bg-gray-100 dark:bg-gray-800";
  }
}

export function getStatusByName(
  statuses: Status[],
  statusName: string,
): Status | null {
  return (
    statuses.find(
      (status) => status.name === statusName || status._id === statusName,
    ) || null
  );
}

export function getStatusColor(statuses: Status[], statusName: string): string {
  const status = getStatusByName(statuses, statusName);
  return status?.color || "#3B82F6";
}

export function getActivityDescription(activity: Activity): string {
  switch (activity.type) {
    case "STATUS_CHANGE":
      if (
        activity.metadata?.reason === "status_deleted" ||
        activity.metadata?.previousStatusDeleted
      ) {
        return "reset status — previous status deleted";
      }
      return "changed status";
    case "ASSIGNMENT":
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
    case "REMINDER_CREATED":
      return "created reminder";
    case "REMINDER_UPDATED":
      return "updated reminder";
    case "REMINDER_DELETED":
      return "deleted reminder";
    case "REMINDER_COMPLETED":
      return "completed reminder";
    case "REMINDER_SNOOZED":
      return "snoozed reminder";
    case "REMINDER_DISMISSED":
      return "dismissed reminder";
    case "REMINDER_MUTED":
      return "muted reminder";
    case "REMINDER_UNMUTED":
      return "unmuted reminder";
    default:
      return activity.description;
  }
}

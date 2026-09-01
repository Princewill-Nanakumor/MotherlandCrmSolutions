// src/components/leads/leadDetailsPanel/commentsAndActivities/utils.ts

import { format, formatDistanceToNow, isValid } from "date-fns";
import { ApiComment, Comment } from "./types";

export const LOCAL_STORAGE_KEY = (leadId: string) => `lead_comment_draft_${leadId}`;
export const TEXTAREA_TOGGLE_KEY = "lead_comment_textarea_visible";

export function loadCommentDraft(leadId: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LOCAL_STORAGE_KEY(leadId)) ?? "";
}

export function persistCommentDraft(leadId: string, content: string): void {
  if (typeof window === "undefined") return;
  if (content) {
    localStorage.setItem(LOCAL_STORAGE_KEY(leadId), content);
  } else {
    localStorage.removeItem(LOCAL_STORAGE_KEY(leadId));
  }
}

export function transformComment(apiComment: ApiComment): Comment {
  const userId = apiComment.createdBy._id || apiComment.createdBy.id || "";
  return {
    _id: apiComment._id,
    content: apiComment.content,
    createdAt: apiComment.createdAt,
    createdBy: {
      _id: userId,
      firstName: apiComment.createdBy.firstName,
      lastName: apiComment.createdBy.lastName,
      avatar: apiComment.createdBy.avatar,
    },
  };
}

export function formatDate(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!isValid(dateObj)) return "Invalid date";
    return format(dateObj, "d MMM, yyyy 'at' h:mm a");
  } catch (error) {
    console.error("Error formatting date", error);
    return "";
  }
}

export function formatRelative(date: Date | string): string {
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!isValid(dateObj)) return "";
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return "";
  }
}

export function getUserDisplayName(
  createdBy:
    | {
        _id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
      }
    | string
): string {
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
}

// src/components/leads/leadDetailsPanel/commentsAndActivities/utils.ts

import { format, formatDistanceToNow, isValid } from "date-fns";
import { ApiComment, Comment } from "./types";

export const LOCAL_STORAGE_KEY = (leadId: string) => `lead_comment_draft_${leadId}`;
export const TEXTAREA_TOGGLE_KEY = "lead_comment_textarea_visible";

export type CommentDraft = {
  content: string;
  createdAt: string;
  userId: string;
  firstName: string;
  lastName: string;
};

export function emptyCommentDraft(): CommentDraft {
  return {
    content: "",
    createdAt: "",
    userId: "",
    firstName: "",
    lastName: "",
  };
}

export function getCommentDraftAuthorLabel(draft: CommentDraft): string {
  const name = `${draft.firstName} ${draft.lastName}`.trim();
  return name || "You";
}

export function loadCommentDraft(leadId: string): CommentDraft {
  if (typeof window === "undefined") return emptyCommentDraft();

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY(leadId));
  if (!raw) return emptyCommentDraft();

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Partial<CommentDraft>;
      return {
        content: parsed.content ?? "",
        createdAt: parsed.createdAt ?? "",
        userId: parsed.userId ?? "",
        firstName: parsed.firstName ?? "",
        lastName: parsed.lastName ?? "",
      };
    } catch {
      return { ...emptyCommentDraft(), content: raw };
    }
  }

  return { ...emptyCommentDraft(), content: raw };
}

export function persistCommentDraft(leadId: string, draft: CommentDraft): void {
  if (typeof window === "undefined") return;
  if (!draft.content.trim()) {
    localStorage.removeItem(LOCAL_STORAGE_KEY(leadId));
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY(leadId), JSON.stringify(draft));
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

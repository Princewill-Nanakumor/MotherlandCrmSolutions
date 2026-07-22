// src/components/leads/leadDetailsPanel/commentsAndActivities/CommentItem.tsx
"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, MessageSquare, Pencil, Save, Trash2, X } from "lucide-react";
import { Comment } from "./types";
import { formatDate, formatRelative } from "./utils";

interface CommentItemProps {
  comment: Comment;
  isEditing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  isAdmin: boolean;
  /** True only for the comment row currently being deleted (shows spinner) */
  isDeleting: boolean;
  /** True when any delete is in progress (disables all delete buttons) */
  isDeleteDisabled?: boolean;
  isEditingMutation: boolean;
  onEdit: (comment: Comment) => void;
  onSaveEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
}

export const CommentItem: FC<CommentItemProps> = ({
  comment,
  isEditing,
  editContent,
  setEditContent,
  isAdmin,
  isDeleting,
  isDeleteDisabled = false,
  isEditingMutation,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}) => {
  return (
    <div className="p-4 border rounded-md group bg-gray-100 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={comment.createdBy?.avatar} />
          <AvatarFallback className="bg-[color-mix(in_srgb,var(--brand-from)_18%,white)] text-(--brand-from)! dark:bg-[color-mix(in_srgb,var(--brand-from)_30%,#111827)] dark:text-(--brand-focus)!">
            {comment.createdBy?.firstName?.[0]}
            {comment.createdBy?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2 mb-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 brand-icon" />
              <h4 className="text-xs font-semibold text-gray-800! dark:text-white!">
                {comment.createdBy?.firstName} {comment.createdBy?.lastName}
              </h4>
            </div>
            <span className="text-xs text-gray-500! dark:text-gray-400!">
              commented {formatRelative(comment.createdAt)}
            </span>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-(--brand-focus) dark:bg-transparent text-gray-700! dark:text-white!"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                disabled={isEditingMutation}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onSaveEdit(comment)}
                  disabled={isEditingMutation || !editContent.trim()}
                >
                  {isEditingMutation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span className="ml-2">Save</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                  disabled={isEditingMutation}
                >
                  <X className="w-4 h-4" />
                  <span className="ml-2">Cancel</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-gray-700! dark:text-white! whitespace-pre-line wrap-break-word">
                {comment.content}
              </p>
              <p className="text-xs text-gray-600! dark:text-gray-400! mt-1">
                {formatDate(comment.createdAt)}
              </p>
            </div>
          )}
        </div>

        {isAdmin && !isEditing && (
          <div className="flex gap-1 transition-opacity duration-200 opacity-0 shrink-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500! hover:text-(--brand-from)! dark:text-gray-400! dark:hover:text-(--brand-focus)!"
              onClick={() => onEdit(comment)}
              disabled={isEditingMutation}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500! hover:text-red-500! dark:text-gray-400! dark:hover:text-red-400!"
              onClick={() => onDelete(comment._id)}
              disabled={isDeleting || isDeleteDisabled}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

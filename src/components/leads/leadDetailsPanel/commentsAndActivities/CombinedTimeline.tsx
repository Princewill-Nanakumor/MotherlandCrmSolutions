// src/components/leads/leadDetailsPanel/commentsAndActivities/CombinedTimeline.tsx
"use client";

import { FC } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import type { Status } from "@/types/leads";
import { CombinedItem, Comment } from "./types";
import { CommentItem } from "./CommentItem";
import { ActivityItem } from "./ActivityItem";

interface CombinedTimelineProps {
  combinedItems: CombinedItem[];
  statuses: Status[];
  editingId: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  isAdmin: boolean;
  /** Id of the comment currently being deleted (only that row shows spinner) */
  deletingCommentId: string | null;
  /** Id of the activity currently being deleted (only that row shows spinner) */
  deletingActivityId?: string | null;
  isEditingMutation: boolean;
  onEdit: (comment: Comment) => void;
  onSaveEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
  onDeleteActivity?: (activityId: string) => void;
}

export const CombinedTimeline: FC<CombinedTimelineProps> = ({
  combinedItems,
  statuses,
  editingId,
  editContent,
  setEditContent,
  isAdmin,
  deletingCommentId,
  deletingActivityId = null,
  isEditingMutation,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDeleteActivity,
}) => {
  if (combinedItems.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1 bg-gray-100 border border-gray-300 border-dashed rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="text-center">
          <ActivityIcon className="w-12 h-12 mx-auto mb-4 text-gray-300! dark:text-gray-600!" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300! mb-2">
            No Comments or Activities Yet
          </p>
          <p className="text-sm text-gray-500! dark:text-gray-400!">
            Add a comment or make changes to this lead to see activity here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner dark:bg-gray-800 dark:border-gray-700"
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

      {combinedItems.map((item) => {
        if (item.type === "comment" && item.comment) {
          const comment = item.comment;
          return (
            <CommentItem
              key={item.id}
              comment={comment}
              isEditing={editingId === comment._id}
              editContent={editContent}
              setEditContent={setEditContent}
              isAdmin={isAdmin}
              isDeleting={deletingCommentId === comment._id}
              isDeleteDisabled={!!deletingCommentId}
              isEditingMutation={isEditingMutation}
              onEdit={onEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
            />
          );
        } else if (item.type === "activity" && item.activity) {
          const activity = item.activity;
          return (
            <ActivityItem
              key={item.id}
              activity={activity}
              statuses={statuses}
              isAdmin={isAdmin}
              isDeleting={deletingActivityId === activity._id}
              isDeleteDisabled={!!deletingActivityId}
              onDelete={onDeleteActivity}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

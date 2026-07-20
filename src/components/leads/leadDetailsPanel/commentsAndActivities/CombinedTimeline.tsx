// src/components/leads/leadDetailsPanel/commentsAndActivities/CombinedTimeline.tsx
"use client";

import { FC } from "react";
import { Activity as ActivityIcon, CalendarPlus } from "lucide-react";
import type { Status } from "@/types/leads";
import { CombinedItem, Comment } from "./types";
import { CommentItem } from "./CommentItem";
import { ActivityItem } from "./ActivityItem";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";

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
  leadCreatedAt?: string;
  emptyTitle?: string;
  emptyDescription?: string;
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
  leadCreatedAt,
  emptyTitle = "No Comments or Activities Yet",
  emptyDescription = "Add a comment or make changes to this lead to see activity here.",
}) => {
  const { timeFormat, dateFormat, timezone } = useDateTimeSettings();

  const leadCreatedEntry = leadCreatedAt ? (() => {
    const date = new Date(leadCreatedAt);
    const locale = dateFormat === "MM/DD/YYYY" ? "en-US" : dateFormat === "YYYY-MM-DD" ? "en-CA" : "en-GB";
    const tzOpt = timezone ? { timeZone: timezone } : undefined;
    const dateStr = date.toLocaleDateString(locale, tzOpt);
    const hour12 = timeFormat === "12h";
    let timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12, ...tzOpt });
    if (hour12) timeStr = timeStr.replace(/ (\w{2})$/, "\u2009$1");
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-gray-100 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-center p-2.5 rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
          <CalendarPlus className="w-5 h-5 text-orange-600! dark:text-orange-400!" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900! dark:text-white!">
            Lead Created
          </p>
          <p className="text-xs text-gray-600! dark:text-gray-400!">
            {dateStr} at {timeStr}
          </p>
        </div>
      </div>
    );
  })() : null;

  if (combinedItems.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-inner dark:bg-transparent dark:border-gray-700">
        <div className="flex items-center justify-center flex-1 bg-gray-100 border border-gray-300 border-dashed rounded-lg dark:bg-transparent dark:border-gray-700">
          <div className="text-center">
            <ActivityIcon className="w-12 h-12 mx-auto mb-4 text-gray-300! dark:text-gray-600!" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300! mb-2">
              {emptyTitle}
            </p>
            {emptyDescription ? (
              <p className="text-sm text-gray-500! dark:text-gray-400!">
                {emptyDescription}
              </p>
            ) : null}
          </div>
        </div>
        {leadCreatedEntry}
      </div>
    );
  }

  return (
    <div
      className="flex-1 min-h-0 p-4 space-y-4 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner dark:bg-transparent dark:border-gray-700"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "var(--brand-from) #f3f4f6",
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
          background: var(--brand-from);
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: var(--brand-from);
        }
        .dark div::-webkit-scrollbar-track {
          background: #374151;
        }
        .dark div::-webkit-scrollbar-thumb {
          background: var(--brand-from);
        }
        .dark div::-webkit-scrollbar-thumb:hover {
          background: var(--brand-from);
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

      {leadCreatedEntry}
    </div>
  );
};

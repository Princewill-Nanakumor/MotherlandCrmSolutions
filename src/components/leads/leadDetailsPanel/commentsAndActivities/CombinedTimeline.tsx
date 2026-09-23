// src/components/leads/leadDetailsPanel/commentsAndActivities/CombinedTimeline.tsx
"use client";

import { FC, useLayoutEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity as ActivityIcon, CalendarPlus } from "lucide-react";
import type { Status } from "@/types/leads";
import { CombinedItem, Comment } from "./types";
import { CommentItem } from "./CommentItem";
import { ActivityItem } from "./ActivityItem";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";

interface CombinedTimelineProps {
  combinedItems: CombinedItem[];
  /** Full timeline ids so filter changes do not replay enter animations. */
  allItemIds?: string[];
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
  allItemIds,
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
  const reduceMotion = useReducedMotion();
  const { timeFormat, dateFormat, timezone } = useDateTimeSettings();
  const knownKey = (allItemIds ?? combinedItems.map((item) => item.id)).join(
    "\n",
  );
  const seenIdsRef = useRef<Set<string> | null>(null);
  const prevItemsRef = useRef<CombinedItem[]>([]);
  /** Keep motion keys stable when optimistic status rows swap to real Mongo ids. */
  const motionKeyAliasRef = useRef<Map<string, string>>(new Map());
  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set(knownKey ? knownKey.split("\n") : []);
  }

  const { enteringIds, motionKeys } = useMemo(() => {
    const seen = seenIdsRef.current ?? new Set<string>();
    const aliases = motionKeyAliasRef.current;
    const currentIds = new Set(combinedItems.map((item) => item.id));
    // Status changes insert an optimistic row, then refetch/realtime swaps in the
    // real Mongo id. Keep the optimistic motion key so Framer does not remount.
    const leftOptimisticStatus = prevItemsRef.current.filter(
      (item) =>
        item.id.startsWith("activity-optimistic-") &&
        !currentIds.has(item.id) &&
        item.activity?.type === "STATUS_CHANGE",
    );
    const liveOptimisticStatus = combinedItems.filter(
      (item) =>
        item.id.startsWith("activity-optimistic-") &&
        item.activity?.type === "STATUS_CHANGE",
    );
    const replaceableOptimistic = [
      ...leftOptimisticStatus,
      ...liveOptimisticStatus,
    ];

    for (const item of combinedItems) {
      if (
        item.type !== "activity" ||
        item.activity?.type !== "STATUS_CHANGE" ||
        item.id.startsWith("activity-optimistic-") ||
        aliases.has(item.id)
      ) {
        continue;
      }
      const oldStatusId = item.activity.metadata?.oldStatusId;
      const newStatusId = item.activity.metadata?.newStatusId;
      const match = replaceableOptimistic.find(
        (optimistic) =>
          optimistic.activity?.metadata?.oldStatusId === oldStatusId &&
          optimistic.activity?.metadata?.newStatusId === newStatusId,
      );
      if (match) {
        aliases.set(item.id, match.id);
        seen.add(item.id);
      }
    }

    // Drop aliases for ids no longer in the timeline
    for (const id of aliases.keys()) {
      if (!currentIds.has(id)) aliases.delete(id);
    }

    const keys = new Map<string, string>();
    const nextEntering = new Set<string>();
    for (const item of combinedItems) {
      keys.set(item.id, aliases.get(item.id) ?? item.id);
      if (seen.has(item.id)) continue;
      nextEntering.add(item.id);
    }
    return { enteringIds: nextEntering, motionKeys: keys };
  }, [combinedItems]);

  useLayoutEffect(() => {
    const seen = seenIdsRef.current;
    if (!seen || !knownKey) return;
    for (const id of knownKey.split("\n")) seen.add(id);
    prevItemsRef.current = combinedItems;
  }, [knownKey, combinedItems]);

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
      className="flex min-h-0 flex-col gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-inner dark:bg-transparent dark:border-gray-700 sm:p-4 md:flex-1 md:min-h-0 md:overflow-y-auto lead-panel-scroll"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "var(--brand-from) #f3f4f6",
      }}
    >
      {combinedItems.map((item) => {
        // Prefer the server STATUS_CHANGE over a still-cached optimistic twin.
        if (
          item.id.startsWith("activity-optimistic-") &&
          item.activity?.type === "STATUS_CHANGE"
        ) {
          const oldStatusId = item.activity.metadata?.oldStatusId;
          const newStatusId = item.activity.metadata?.newStatusId;
          const hasRealTwin = combinedItems.some(
            (other) =>
              other.type === "activity" &&
              other.activity?.type === "STATUS_CHANGE" &&
              !other.id.startsWith("activity-optimistic-") &&
              other.activity.metadata?.oldStatusId === oldStatusId &&
              other.activity.metadata?.newStatusId === newStatusId,
          );
          if (hasRealTwin) return null;
        }

        const isNew = enteringIds.has(item.id);
        const row = (() => {
          if (item.type === "comment" && item.comment) {
            const comment = item.comment;
            return (
              <CommentItem
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
          }
          if (item.type === "activity" && item.activity) {
            const activity = item.activity;
            return (
              <ActivityItem
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
        })();

        if (!row) return null;

        return (
          <motion.div
            key={motionKeys.get(item.id) ?? item.id}
            initial={
              isNew && !reduceMotion
                ? { opacity: 0, y: -10, scale: 0.98 }
                : false
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {row}
          </motion.div>
        );
      })}

      {leadCreatedEntry}
    </div>
  );
};

// src/components/leads/leadDetailsPanel/commentsAndActivities/CombinedTimeline.tsx
"use client";

import { FC, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Activity as ActivityIcon, CalendarPlus } from "lucide-react";
import type { Status } from "@/types/leads";
import { CombinedItem, Comment } from "./types";
import { CommentItem } from "./CommentItem";
import { ActivityItem } from "./ActivityItem";
import { useDateTimeSettings } from "@/context/DateTimeSettingsContext";

const MOTION_EASE = [0.22, 1, 0.36, 1] as const;
const FILTER_TRANSITION = { duration: 0.18, ease: MOTION_EASE };
const ITEM_ENTER_TRANSITION = { duration: 0.2, ease: MOTION_EASE };

function isOptimisticStatusItem(item: CombinedItem): boolean {
  return (
    item.id.startsWith("activity-optimistic-") &&
    item.activity?.type === "STATUS_CHANGE"
  );
}

function isRealStatusItem(item: CombinedItem): boolean {
  return (
    item.type === "activity" &&
    item.activity?.type === "STATUS_CHANGE" &&
    !item.id.startsWith("activity-optimistic-")
  );
}

function sameStatusChange(a: CombinedItem, b: CombinedItem): boolean {
  return (
    a.activity?.metadata?.oldStatusId === b.activity?.metadata?.oldStatusId &&
    a.activity?.metadata?.newStatusId === b.activity?.metadata?.newStatusId
  );
}

interface CombinedTimelineProps {
  combinedItems: CombinedItem[];
  /** Full timeline ids so filter changes do not replay enter animations. */
  allItemIds?: string[];
  /** Timeline / Comments / Status / Calls — drives list swap animation. */
  filterKey?: string;
  statuses: Status[];
  editingId: string | null;
  editContent: string;
  setEditContent: (content: string) => void;
  isAdmin: boolean;
  deletingCommentId: string | null;
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
  filterKey = "all",
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
  /** Stable motion keys when optimistic status rows swap to real Mongo ids. */
  const motionKeyAliasRef = useRef<Map<string, string>>(new Map());

  if (seenIdsRef.current === null) {
    seenIdsRef.current = new Set(knownKey ? knownKey.split("\n") : []);
  }

  const visibleItems = useMemo(
    () =>
      combinedItems.filter((item) => {
        if (!isOptimisticStatusItem(item)) return true;
        return !combinedItems.some(
          (other) => isRealStatusItem(other) && sameStatusChange(item, other),
        );
      }),
    [combinedItems],
  );

  const { enteringIds, motionKeys } = useMemo(() => {
    const seen = seenIdsRef.current ?? new Set<string>();
    const aliases = motionKeyAliasRef.current;
    const currentIds = new Set(combinedItems.map((item) => item.id));

    const replaceableOptimistic = [
      ...prevItemsRef.current.filter(
        (item) => isOptimisticStatusItem(item) && !currentIds.has(item.id),
      ),
      ...combinedItems.filter(isOptimisticStatusItem),
    ];

    for (const item of combinedItems) {
      if (!isRealStatusItem(item) || aliases.has(item.id)) continue;
      const match = replaceableOptimistic.find((optimistic) =>
        sameStatusChange(optimistic, item),
      );
      if (match) {
        aliases.set(item.id, match.id);
        seen.add(item.id);
      }
    }

    for (const id of aliases.keys()) {
      if (!currentIds.has(id)) aliases.delete(id);
    }

    const keys = new Map<string, string>();
    const nextEntering = new Set<string>();
    for (const item of combinedItems) {
      keys.set(item.id, aliases.get(item.id) ?? item.id);
      if (!seen.has(item.id)) nextEntering.add(item.id);
    }
    return { enteringIds: nextEntering, motionKeys: keys };
  }, [combinedItems]);

  useLayoutEffect(() => {
    const seen = seenIdsRef.current;
    if (!seen || !knownKey) return;
    for (const id of knownKey.split("\n")) seen.add(id);
    prevItemsRef.current = combinedItems;
  }, [knownKey, combinedItems]);

  const leadCreatedEntry = useMemo(() => {
    if (!leadCreatedAt) return null;
    const date = new Date(leadCreatedAt);
    const locale =
      dateFormat === "MM/DD/YYYY"
        ? "en-US"
        : dateFormat === "YYYY-MM-DD"
          ? "en-CA"
          : "en-GB";
    const tzOpt = timezone ? { timeZone: timezone } : undefined;
    const dateStr = date.toLocaleDateString(locale, tzOpt);
    const hour12 = timeFormat === "12h";
    let timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
      ...tzOpt,
    });
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
  }, [leadCreatedAt, dateFormat, timeFormat, timezone]);

  const isEmpty = visibleItems.length === 0;
  const filterTransition = reduceMotion ? { duration: 0 } : FILTER_TRANSITION;

  const listBody = isEmpty ? (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex items-center justify-center flex-1 bg-gray-100 border border-gray-300 border-dashed rounded-lg dark:bg-transparent dark:border-gray-700">
        <div className="text-center">
          <ActivityIcon className="w-12 h-12 mx-auto mb-4 text-gray-300! dark:text-gray-600!" />
          <p className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300!">
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
  ) : (
    <>
      {visibleItems.map((item) => {
        const isNew = enteringIds.has(item.id);
        let row: ReactNode = null;

        if (item.type === "comment" && item.comment) {
          const comment = item.comment;
          row = (
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
        } else if (item.type === "activity" && item.activity) {
          const activity = item.activity;
          row = (
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
            transition={ITEM_ENTER_TRANSITION}
          >
            {row}
          </motion.div>
        );
      })}
      {leadCreatedEntry}
    </>
  );

  return (
    <div
      className={`flex min-h-0 flex-col rounded-lg border border-gray-200 bg-white shadow-inner dark:bg-transparent dark:border-gray-700 md:flex-1 md:min-h-0 md:overflow-y-auto lead-panel-scroll ${
        isEmpty ? "p-4" : "p-3 sm:p-4"
      }`}
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "var(--brand-from) #f3f4f6",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={filterKey}
          className="flex min-h-0 flex-1 flex-col gap-4"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
          transition={filterTransition}
        >
          {listBody}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

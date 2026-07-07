// src/components/leads/leadDetailsPanel/CommentsAndActivitiesCombined.tsx
"use client";

import React, { FC, useState, useMemo, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Activity as ActivityIcon,
  MessageSquare,
  ArrowRightLeft,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { Activity, Lead, Status } from "@/types/leads";
import { isTaboolaLeadImportActivity } from "@/lib/leadActivityDisplay";
import { Comment, CombinedItem } from "./commentsAndActivities/types";
import {
  transformComment,
  LOCAL_STORAGE_KEY,
  TEXTAREA_TOGGLE_KEY,
} from "./commentsAndActivities/utils";
import { CommentForm } from "./commentsAndActivities/CommentForm";
import { CombinedTimeline } from "./commentsAndActivities/CombinedTimeline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function truncatePreview(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

interface CommentsAndActivitiesCombinedProps {
  leadId: string;
  leadCreatedAt?: string;
}

export const CommentsAndActivitiesCombined: FC<
  CommentsAndActivitiesCombinedProps
> = ({ leadId, leadCreatedAt }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [commentContent, setCommentContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(
    null,
  );
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<
    string | null
  >(null);
  const [pendingDeleteActivityId, setPendingDeleteActivityId] = useState<
    string | null
  >(null);
  const [showTextarea, setShowTextarea] = useState<boolean>(true);
  const [timelineFilter, setTimelineFilter] = useState<
    "all" | "comments" | "status"
  >("all");

  const isAdmin = session?.user?.role === "ADMIN";

  const patchLeadCachesFromComments = useCallback(
    (nextComments: Comment[], fallbackTimestamp?: string) => {
      const latestComment =
        nextComments.length > 0
          ? [...nextComments].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]
          : undefined;
      const timestamp =
        fallbackTimestamp ||
        latestComment?.createdAt ||
        new Date().toISOString();

      const patchLeadArray = (rows: Lead[] = []): Lead[] =>
        rows.map((lead) => {
          if (lead._id !== leadId) return lead;

          const nextLastComment = latestComment?.content;
          const nextLastCommentDate = latestComment?.createdAt;
          const fallbackActivityAt =
            lead.statusChangedAt || lead.updatedAt || lead.createdAt;

          return {
            ...lead,
            lastComment: nextLastComment,
            lastCommentDate: nextLastCommentDate,
            lastActivityAt: nextLastCommentDate || fallbackActivityAt,
            updatedAt: timestamp,
            commentCount: Math.max(0, nextComments.length),
          };
        });

      const patchUnknownShape = (oldData: unknown): unknown => {
        if (Array.isArray(oldData)) {
          return patchLeadArray(oldData as Lead[]);
        }

        if (oldData && typeof oldData === "object") {
          const typed = oldData as {
            leads?: Lead[];
            data?: Lead[];
          };

          if (Array.isArray(typed.leads)) {
            return { ...typed, leads: patchLeadArray(typed.leads) };
          }

          if (Array.isArray(typed.data)) {
            return { ...typed, data: patchLeadArray(typed.data) };
          }
        }

        return oldData;
      };

      queryClient.setQueriesData(
        {
          predicate: (query) =>
            query.queryKey[0] === "leads" ||
            query.queryKey[0] === "assignedLeads",
        },
        patchUnknownShape,
      );
    },
    [leadId, queryClient],
  );

  // Load textarea state from localStorage on mount
  useEffect(() => {
    const savedToggle = localStorage.getItem(TEXTAREA_TOGGLE_KEY);
    if (savedToggle !== null) {
      setShowTextarea(JSON.parse(savedToggle));
    }
  }, []);

  // Clear draft when lead changes and load saved draft for new lead
  useEffect(() => {
    setCommentContent("");
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY(leadId));
    if (saved) {
      setCommentContent(saved);
    }
  }, [leadId]);

  // Save draft to localStorage when content changes
  useEffect(() => {
    if (commentContent) {
      localStorage.setItem(LOCAL_STORAGE_KEY(leadId), commentContent);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY(leadId));
    }
  }, [commentContent, leadId]);

  // Fetch comments
  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
  } = useQuery<Comment[], Error>({
    queryKey: ["comments", leadId],
    queryFn: async (): Promise<Comment[]> => {
      const response = await fetch(`/api/leads/${leadId}/comments`);
      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }
      const data = await response.json();
      return data.map(transformComment);
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount) => failureCount < 2,
    refetchOnWindowFocus: false,
  });

  // Fetch statuses for activities
  const { data: statuses = [] } = useQuery<Status[], Error>({
    queryKey: ["statuses"],
    queryFn: async (): Promise<Status[]> => {
      const response = await fetch("/api/statuses");
      if (!response.ok) throw new Error("Failed to fetch statuses");
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch activities (excluding COMMENT type)
  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    error: activitiesError,
  } = useQuery<Activity[], Error>({
    queryKey: ["activities", leadId],
    queryFn: async (): Promise<Activity[]> => {
      const response = await fetch(`/api/leads/${leadId}/activities`);
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      const responseData = await response.json();
      return Array.isArray(responseData) ? responseData : [];
    },
    enabled: !!leadId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount) => failureCount < 2,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  // Combine and sort comments and activities by timestamp (newest first)
  const combinedItems: CombinedItem[] = useMemo(() => {
    const items: CombinedItem[] = [];
    const seenCommentIds = new Set<string>();
    const seenActivityIds = new Set<string>();

    // Add comments
    comments.forEach((comment) => {
      if (seenCommentIds.has(comment._id)) return;
      seenCommentIds.add(comment._id);
      const timestamp = new Date(comment.createdAt);
      if (!isNaN(timestamp.getTime())) {
        items.push({
          id: `comment-${comment._id}`,
          type: "comment",
          timestamp,
          comment,
        });
      }
    });

    // Add activities (excluding COMMENT type as they're now shown as comments)
    activities.forEach((activity) => {
      if (isTaboolaLeadImportActivity(activity)) return;
      if (seenActivityIds.has(activity._id)) return;
      seenActivityIds.add(activity._id);
      const timestamp = new Date(activity.createdAt);
      if (!isNaN(timestamp.getTime())) {
        items.push({
          id: `activity-${activity._id}`,
          type: "activity",
          timestamp,
          activity,
        });
      }
    });

    // Sort by timestamp (newest first)
    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [comments, activities]);

  // Subsets for the timeline sub-tabs (Comments only / Status changes only)
  const commentOnlyItems = useMemo(
    () => combinedItems.filter((item) => item.type === "comment"),
    [combinedItems],
  );

  const statusChangeItems = useMemo(
    () =>
      combinedItems.filter(
        (item) =>
          item.type === "activity" && item.activity?.type === "STATUS_CHANGE",
      ),
    [combinedItems],
  );

  const visibleTimelineItems =
    timelineFilter === "comments"
      ? commentOnlyItems
      : timelineFilter === "status"
        ? statusChangeItems
        : combinedItems;

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/leads/${leadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add comment: ${errorText}`);
      }

      const newComment = await response.json();
      return transformComment(newComment);
    },
    onSuccess: (newComment) => {
      let nextComments: Comment[] = [];
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) => {
          // Refetch from realtime invalidation may already include this row — avoid duplicate keys.
          const rest = oldComments.filter((c) => c._id !== newComment._id);
          nextComments = [newComment, ...rest];
          return nextComments;
        },
      );
      patchLeadCachesFromComments(nextComments, newComment.createdAt);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });
      setCommentContent("");
      toast({
        title: "Success",
        description: "Comment added successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  // Delete comment mutation – clear deletingId only in onSettled so only one row shows spinner
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(
        `/api/leads/${leadId}/comments/${commentId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete comment: ${errorText}`);
      }

      return commentId;
    },
    onSuccess: (deletedCommentId) => {
      let nextComments: Comment[] = [];
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) => {
          nextComments = oldComments.filter(
            (comment) => comment._id !== deletedCommentId,
          );
          return nextComments;
        },
      );
      patchLeadCachesFromComments(nextComments);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });
      toast({
        title: "Success",
        description: "Comment deleted successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const response = await fetch(
        `/api/leads/${leadId}/activities/${activityId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete activity: ${errorText}`);
      }

      return activityId;
    },
    onSuccess: (deletedActivityId) => {
      queryClient.setQueryData(
        ["activities", leadId],
        (oldActivities: Activity[] = []) =>
          oldActivities.filter((a) => a._id !== deletedActivityId),
      );
      toast({
        title: "Success",
        description: "Activity deleted successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error deleting activity:", error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDeletingActivityId(null);
    },
  });

  // Edit comment mutation
  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const response = await fetch(
        `/api/leads/${leadId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update comment: ${errorText}`);
      }

      const updatedComment = await response.json();
      return transformComment(updatedComment);
    },
    onSuccess: (updatedComment) => {
      let nextComments: Comment[] = [];
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) => {
          nextComments = oldComments.map((comment) =>
            comment._id === updatedComment._id ? updatedComment : comment,
          );
          return nextComments;
        },
      );
      patchLeadCachesFromComments(nextComments);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });
      toast({
        title: "Success",
        description: "Comment updated successfully",
        variant: "success",
      });
      setEditingId(null);
    },
    onError: (error) => {
      console.error("Error updating comment:", error);
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = useCallback(() => {
    if (!commentContent.trim()) return;
    addCommentMutation.mutate(commentContent);
  }, [commentContent, addCommentMutation]);

  const handleEdit = useCallback((comment: Comment) => {
    setEditingId(comment._id);
    setEditContent(comment.content);
  }, []);

  const handleSaveEdit = useCallback(
    async (comment: Comment) => {
      if (!editContent.trim() || editCommentMutation.isPending) return;
      editCommentMutation.mutate({
        commentId: comment._id,
        content: editContent,
      });
    },
    [editContent, editCommentMutation],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditContent("");
  }, []);

  const handleDelete = useCallback(
    (commentId: string) => {
      if (deletingId || deleteCommentMutation.isPending) return;
      setPendingDeleteCommentId(commentId);
    },
    [deletingId, deleteCommentMutation.isPending],
  );

  const handleDeleteActivity = useCallback(
    (activityId: string) => {
      if (deletingActivityId || deleteActivityMutation.isPending) return;
      setPendingDeleteActivityId(activityId);
    },
    [deletingActivityId, deleteActivityMutation.isPending],
  );

  const confirmDeleteComment = useCallback(() => {
    if (!pendingDeleteCommentId || deleteCommentMutation.isPending) return;
    const commentId = pendingDeleteCommentId;
    setPendingDeleteCommentId(null);
    setDeletingId(commentId);
    deleteCommentMutation.mutate(commentId);
  }, [pendingDeleteCommentId, deleteCommentMutation]);

  const confirmDeleteActivity = useCallback(() => {
    if (!pendingDeleteActivityId || deleteActivityMutation.isPending) return;
    const activityId = pendingDeleteActivityId;
    setPendingDeleteActivityId(null);
    setDeletingActivityId(activityId);
    deleteActivityMutation.mutate(activityId);
  }, [pendingDeleteActivityId, deleteActivityMutation]);

  const pendingDeleteComment = useMemo(
    () => comments.find((c) => c._id === pendingDeleteCommentId),
    [comments, pendingDeleteCommentId],
  );

  const pendingDeleteActivity = useMemo(
    () => activities.find((a) => a._id === pendingDeleteActivityId),
    [activities, pendingDeleteActivityId],
  );

  const isLoading = isLoadingComments || isLoadingActivities;
  const hasError = commentsError || activitiesError;

  if (hasError) {
    console.error(
      "Comments/Activities query error:",
      commentsError || activitiesError,
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-6 h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500! dark:text-blue-400!" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 p-6 min-h-0 bg-gray-50 border border-gray-200 shadow-sm dark:bg-gray-800/50 dark:border-gray-700"
      style={{ height: "100%" }}
    >
      <div className="flex flex-col flex-1 p-5 min-h-0 bg-white rounded-lg border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <CommentForm
          commentContent={commentContent}
          setCommentContent={setCommentContent}
          showTextarea={showTextarea}
          setShowTextarea={setShowTextarea}
          onAddComment={handleAddComment}
          isSaving={addCommentMutation.isPending}
        />

        {/* Combined Timeline */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex flex-wrap gap-1 items-center mb-3">
            {(
              [
                {
                  key: "all",
                  label: "Timeline",
                  icon: ActivityIcon,
                  count: combinedItems.length,
                },
                {
                  key: "comments",
                  label: "Comments",
                  icon: MessageSquare,
                  count: commentOnlyItems.length,
                },
                {
                  key: "status",
                  label: "Status Changes",
                  icon: ArrowRightLeft,
                  count: statusChangeItems.length,
                },
              ] as const
            ).map((tab) => {
              const isActive = timelineFilter === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTimelineFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600! dark:bg-blue-500/10 dark:text-white!"
                      : "text-gray-700! hover:bg-gray-100 dark:text-white! dark:hover:bg-gray-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      isActive
                        ? "bg-blue-100 text-blue-700! dark:bg-blue-500/20 dark:text-blue-300!"
                        : "bg-gray-100 text-gray-600! dark:bg-gray-700 dark:text-gray-300!"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <CombinedTimeline
            combinedItems={visibleTimelineItems}
            statuses={statuses}
            editingId={editingId}
            editContent={editContent}
            setEditContent={setEditContent}
            isAdmin={isAdmin}
            deletingCommentId={deletingId}
            deletingActivityId={deletingActivityId}
            isEditingMutation={editCommentMutation.isPending}
            onEdit={handleEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDelete}
            onDeleteActivity={handleDeleteActivity}
            leadCreatedAt={leadCreatedAt}
            emptyTitle={
              timelineFilter === "comments"
                ? "No Comments Yet"
                : timelineFilter === "status"
                  ? "No Status Changes Yet"
                  : "No Activity Yet"
            }
            emptyDescription={
              timelineFilter === "comments"
                ? "Add a comment to start the conversation on this lead."
                : timelineFilter === "status"
                  ? "Status changes for this lead will appear here."
                  : "Add an activity or make changes to this lead to start the timeline."
            }
          />
        </div>
      </div>

      <AlertDialog
        open={pendingDeleteCommentId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteCommentMutation.isPending) {
            setPendingDeleteCommentId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This cannot be undone. The comment will be removed from the
                  timeline.
                </p>
                {pendingDeleteComment?.content ? (
                  <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-md border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    {truncatePreview(pendingDeleteComment.content)}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCommentMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-white bg-red-600 hover:bg-red-700 hover:text-white focus:ring-red-600"
              disabled={deleteCommentMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteComment();
              }}
            >
              {deleteCommentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete comment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteActivityId !== null}
        onOpenChange={(open) => {
          if (!open && !deleteActivityMutation.isPending) {
            setPendingDeleteActivityId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this activity?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This cannot be undone. The activity entry will be removed from
                  the timeline.
                </p>
                {pendingDeleteActivity ? (
                  <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-md border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    {truncatePreview(
                      pendingDeleteActivity.description ||
                        pendingDeleteActivity.type.replace(/_/g, " "),
                    )}
                  </p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteActivityMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="text-white bg-red-600 hover:bg-red-700 hover:text-white focus:ring-red-600"
              disabled={deleteActivityMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteActivity();
              }}
            >
              {deleteActivityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete activity"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommentsAndActivitiesCombined;

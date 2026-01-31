// src/components/leads/leadDetailsPanel/CommentsAndActivitiesCombined.tsx
"use client";

import React, { FC, useState, useMemo, useCallback, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Activity, Status } from "@/types/leads";
import { Comment, CombinedItem } from "./commentsAndActivities/types";
import {
  transformComment,
  LOCAL_STORAGE_KEY,
  TEXTAREA_TOGGLE_KEY,
} from "./commentsAndActivities/utils";
import { CommentForm } from "./commentsAndActivities/CommentForm";
import { CombinedTimeline } from "./commentsAndActivities/CombinedTimeline";

interface CommentsAndActivitiesCombinedProps {
  leadId: string;
}

export const CommentsAndActivitiesCombined: FC<
  CommentsAndActivitiesCombinedProps
> = ({ leadId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [commentContent, setCommentContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showTextarea, setShowTextarea] = useState<boolean>(true);

  const isAdmin = session?.user?.role === "ADMIN";

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
  });

  // Combine and sort comments and activities by timestamp (newest first)
  const combinedItems: CombinedItem[] = useMemo(() => {
    const items: CombinedItem[] = [];

    // Add comments
    comments.forEach((comment) => {
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
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) => [newComment, ...oldComments],
      );
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
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) =>
          oldComments.filter((comment) => comment._id !== deletedCommentId),
      );
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
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) =>
          oldComments.map((comment) =>
            comment._id === updatedComment._id ? updatedComment : comment,
          ),
      );
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
      if (deletingId) return;
      setDeletingId(commentId);
      deleteCommentMutation.mutate(commentId);
    },
    [deleteCommentMutation, deletingId],
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
        <Loader2 className="w-8 h-8 animate-spin !text-purple-500 dark:!text-blue-400" />
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
          <h3 className="text-lg font-semibold !text-gray-800 dark:!text-white mb-3">
            Timeline ({combinedItems.length})
          </h3>

          <CombinedTimeline
            combinedItems={combinedItems}
            statuses={statuses}
            editingId={editingId}
            editContent={editContent}
            setEditContent={setEditContent}
            isAdmin={isAdmin}
            deletingCommentId={deletingId}
            isEditingMutation={editCommentMutation.isPending}
            onEdit={handleEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default CommentsAndActivitiesCombined;

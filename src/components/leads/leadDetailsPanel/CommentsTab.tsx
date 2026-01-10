// src/components/leads/leadDetailsPanel/CommentsTab.tsx
"use client";

import { FC, useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Comments from "./Comments";
import { Loader2 } from "lucide-react";

interface ApiComment {
  _id: string;
  content: string;
  createdAt: string;
  createdBy: {
    _id?: string;
    id?: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

export interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface CommentsTabProps {
  leadId: string;
}

function transformComment(apiComment: ApiComment): Comment {
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

export const CommentsTab: FC<CommentsTabProps> = ({ leadId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState("");

  // React Query for fetching comments
  const {
    data: comments = [],
    isLoading: isLoadingComments,
    error: commentsError,
  } = useQuery({
    queryKey: ["comments", leadId],
    queryFn: async (): Promise<Comment[]> => {
      console.log("=== FETCHING COMMENTS WITH REACT QUERY ===");
      console.log("Lead ID:", leadId);

      const response = await fetch(`/api/leads/${leadId}/comments`);
      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      const data = await response.json();
      console.log("Raw comments data:", data);

      const transformedComments = data.map(transformComment);
      console.log("Transformed comments:", transformedComments);

      return transformedComments;
    },
    enabled: !!leadId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.error("Comments fetch error:", error);
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      console.log("=== ADDING COMMENT WITH REACT QUERY ===");
      console.log("Lead ID:", leadId);
      console.log("Content:", content);

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
      // Optimistically update the cache
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) => [newComment, ...oldComments]
      );

      // Don't invalidate activities - comments don't create activities anymore
      // Comments are displayed directly, activities only log non-comment actions

      // Invalidate all leads queries to update last comment in table
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

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(
        `/api/leads/${leadId}/comments/${commentId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete comment: ${errorText}`);
      }

      return commentId;
    },
    onSuccess: (deletedCommentId) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) =>
          oldComments.filter((comment) => comment._id !== deletedCommentId)
      );

      // Don't invalidate activities - comments don't create activities anymore
      // Comments are displayed directly, activities only log non-comment actions

      // Invalidate all leads queries to update last comment in table
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
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update comment: ${errorText}`);
      }

      const updatedComment = await response.json();
      return transformComment(updatedComment);
    },
    onSuccess: (updatedComment) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        ["comments", leadId],
        (oldComments: Comment[] = []) =>
          oldComments.map((comment) =>
            comment._id === updatedComment._id ? updatedComment : comment
          )
      );

      // Don't invalidate activities - comments don't create activities anymore
      // Comments are displayed directly, activities only log non-comment actions

      // Invalidate all leads queries to update last comment in table
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["assignedLeads"] });

      toast({
        title: "Success",
        description: "Comment updated successfully",
        variant: "success",
      });
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

  // Handle comment actions
  const handleAddComment = useCallback(async () => {
    if (!commentContent.trim()) return;
    addCommentMutation.mutate(commentContent);
  }, [commentContent, addCommentMutation]);

  const handleCommentDeleted = useCallback(
    async (commentId: string) => {
      deleteCommentMutation.mutate(commentId);
    },
    [deleteCommentMutation]
  );

  const handleCommentEdited = useCallback(
    async (updatedComment: Comment) => {
      editCommentMutation.mutate({
        commentId: updatedComment._id,
        content: updatedComment.content,
      });
    },
    [editCommentMutation]
  );

  // Handle errors
  if (commentsError) {
    console.error("Comments query error:", commentsError);
    toast({
      title: "Error",
      description: "Failed to fetch comments",
      variant: "destructive",
    });
  }

  // Loading spinner to avoid empty state flash
  if (isLoadingComments) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <Comments
      comments={comments}
      commentContent={commentContent}
      setCommentContent={setCommentContent}
      isSaving={addCommentMutation.isPending}
      handleAddComment={handleAddComment}
      onCommentDeleted={handleCommentDeleted}
      onCommentEdited={handleCommentEdited}
      isDeleting={deleteCommentMutation.isPending}
      isEditing={editCommentMutation.isPending}
      leadId={leadId}
    />
  );
};

export default CommentsTab;

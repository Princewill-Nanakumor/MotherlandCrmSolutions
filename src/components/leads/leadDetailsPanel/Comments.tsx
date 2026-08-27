// src/components/leads/leadDetailsPanel/Comments.tsx
"use client";

import { FC, useState, useEffect, KeyboardEvent } from "react";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  ChevronUp,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow, isValid } from "date-fns";
import { Comments as CommentType } from "@/types/leads";
import { canDeleteComments } from "@/lib/roles";

interface CommentsProps {
  comments: CommentType[];
  commentContent: string;
  setCommentContent: (val: string) => void;
  isSaving: boolean;
  handleAddComment: () => void;
  onCommentDeleted?: (commentId: string) => void;
  onCommentEdited?: (updatedComment: CommentType) => void;
  /** Id of the comment currently being deleted (only that row shows spinner) */
  deletingCommentId?: string | null;
  isEditing?: boolean;
  leadId: string;
}

const LOCAL_STORAGE_KEY = (leadId: string) => `lead_comment_draft_${leadId}`;
const TEXTAREA_TOGGLE_KEY = "lead_comment_textarea_visible";

const Comments: FC<CommentsProps> = ({
  comments,
  commentContent,
  setCommentContent,
  isSaving,
  handleAddComment,
  onCommentDeleted,
  onCommentEdited,
  deletingCommentId = null,
  isEditing = false,
  leadId,
}) => {
  const { data: session } = useSession();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [showTextarea, setShowTextarea] = useState<boolean>(true);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const canModerateComments = canDeleteComments(session?.user);

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Handle textarea toggle
  const handleToggleTextarea = () => {
    const newState = !showTextarea;
    setShowTextarea(newState);
    localStorage.setItem(TEXTAREA_TOGGLE_KEY, JSON.stringify(newState));
  };

  // Load draft from localStorage on mount - lead-specific
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY(leadId));
    if (saved && !commentContent) {
      setCommentContent(saved);
    }
    // eslint-disable-next-line
  }, [leadId]);

  // Load textarea visibility state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TEXTAREA_TOGGLE_KEY);
    if (saved !== null) {
      setShowTextarea(JSON.parse(saved));
    }
  }, []);

  // Save draft to localStorage on change - lead-specific
  useEffect(() => {
    if (commentContent) {
      localStorage.setItem(LOCAL_STORAGE_KEY(leadId), commentContent);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY(leadId));
    }
  }, [commentContent, leadId]);

  // Clear draft when lead changes
  useEffect(() => {
    setCommentContent("");
  }, [leadId, setCommentContent]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "Invalid date";
      return format(date, "d MMM, yyyy 'at' h:mm a");
    } catch (error) {
      console.error("Error formatting date", error);
      return "";
    }
  };

  const formatRelative = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return "";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "";
    }
  };

  const handleDelete = (commentId: string) => {
    if (deletingCommentId || !onCommentDeleted) return;
    onCommentDeleted(commentId);
  };

  const handleEdit = (comment: CommentType) => {
    setEditingId(comment._id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (comment: CommentType) => {
    if (!onCommentEdited || !editContent.trim() || isEditing) return;

    try {
      await onCommentEdited({
        ...comment,
        content: editContent,
      });
      setEditingId(null);
    } catch (err) {
      console.error("Error updating comment:", err);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      if (!isSaving && commentContent.trim()) {
        e.preventDefault();
        handleAddComment();
      }
    }
  };

  return (
    <div
      className="flex flex-col flex-1 p-6 min-h-0 bg-gray-50 border border-gray-200 shadow-sm dark:bg-transparent dark:border-gray-700"
      style={{ height: "100%" }}
    >
      <div className="flex flex-col flex-1 p-5 min-h-0 bg-white rounded-lg border border-gray-100 shadow-sm dark:bg-transparent dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800! dark:text-white!">
            Add a comment
          </h3>
          <Button
            onClick={handleToggleTextarea}
            variant="ghost"
            size="sm"
            className="text-gray-500! hover:text-gray-700! dark:text-gray-400! dark:hover:text-gray-200!"
            title={`${showTextarea ? "Hide" : "Show"} comment textarea`}
          >
            <Type className="w-4 h-4" />
            <ChevronUp
              className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                showTextarea ? "rotate-0" : "rotate-180"
              }`}
            />
          </Button>
        </div>
        {/* Textarea container with smooth transition */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showTextarea ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="space-y-3">
            {/* Textarea with explicit border control to fix thickness inconsistency */}
            <textarea
              placeholder="Write your thoughts about this lead... (Press Cmd/Ctrl + Enter to submit)"
              className="w-full p-3 rounded-md focus:outline-none resize-none min-h-30 text-gray-700! dark:text-white! bg-white dark:bg-transparent transition-all duration-200"
              style={{
                borderTopWidth: "1px",
                borderRightWidth: "1px",
                borderBottomWidth: "1px",
                borderLeftWidth: "1px",
                borderTopStyle: "solid",
                borderRightStyle: "solid",
                borderBottomStyle: "solid",
                borderLeftStyle: "solid",
                borderTopColor: isDarkMode
                  ? "rgb(75 85 99)"
                  : "rgb(209 213 219)",
                borderRightColor: isDarkMode
                  ? "rgb(75 85 99)"
                  : "rgb(209 213 219)",
                borderBottomColor: isDarkMode
                  ? "rgb(75 85 99)"
                  : "rgb(209 213 219)",
                borderLeftColor: isDarkMode
                  ? "rgb(75 85 99)"
                  : "rgb(209 213 219)",
                boxShadow: "none", // Remove any shadow that might interfere
              }}
              onFocus={(e) => {
                const focusColor =
                  getComputedStyle(document.documentElement)
                    .getPropertyValue("--brand-focus")
                    .trim() || "#2d6f8b";
                e.target.style.borderTopColor = focusColor;
                e.target.style.borderRightColor = focusColor;
                e.target.style.borderBottomColor = focusColor;
                e.target.style.borderLeftColor = focusColor;
                e.target.style.boxShadow = "none";
              }}
              onBlur={(e) => {
                const defaultColor = isDarkMode
                  ? "rgb(75 85 99)"
                  : "rgb(209 213 219)";
                e.target.style.borderTopColor = defaultColor;
                e.target.style.borderRightColor = defaultColor;
                e.target.style.borderBottomColor = defaultColor;
                e.target.style.borderLeftColor = defaultColor;
                e.target.style.boxShadow = "none";
              }}
              rows={4}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
            />
            <div className="flex justify-end pt-1">
              <button
                onClick={handleAddComment}
                disabled={isSaving || !commentContent.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 brand-gradient hover:brightness-95 text-white rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 focus:border-(--brand-focus) disabled:opacity-50 disabled:pointer-events-none"
                style={{ border: "none", boxShadow: "none" }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Comment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div
          className={`transition-all duration-300 ease-in-out ${
            showTextarea ? "mt-6" : "mt-0"
          } flex-1 min-h-0 flex flex-col`}
        >
          <h3 className="text-lg font-semibold text-gray-800! dark:text-white! mb-3">
            Comments ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <div className="flex flex-1 justify-center items-center bg-gray-100 rounded-lg border border-gray-300 border-dashed dark:bg-transparent dark:border-gray-700">
              <div className="text-center">
                <p className="text-gray-500! dark:text-gray-400!">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            </div>
          ) : (
            <div
              className="overflow-y-auto flex-1 p-4 space-y-4 min-h-0 bg-white rounded-lg border border-gray-200 shadow-inner dark:bg-transparent dark:border-gray-700 lead-panel-scroll"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "var(--brand-from) #f3f4f6",
              }}
            >
              {comments.map((comment) => (
                <div
                  key={comment._id}
                  className="p-4 bg-gray-100 rounded-md border border-gray-100 group dark:bg-transparent dark:border-gray-700"
                >
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.createdBy?.avatar} />
                      <AvatarFallback className="bg-[color-mix(in_srgb,var(--brand-from)_18%,white)] text-(--brand-from) dark:bg-[color-mix(in_srgb,var(--brand-from)_30%,#111827)] dark:text-(--brand-focus)">
                        {comment.createdBy?.firstName?.[0]}
                        {comment.createdBy?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 items-baseline">
                        <h4 className="text-sm font-semibold text-gray-800! dark:text-white!">
                          {comment.createdBy?.firstName}{" "}
                          {comment.createdBy?.lastName}
                        </h4>
                        <span className="text-xs text-gray-500! dark:text-gray-400!">
                          {formatRelative(comment.createdAt)}
                        </span>
                      </div>

                      {editingId === comment._id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-0 focus:border-(--brand-focus) dark:bg-transparent text-gray-700! dark:text-white!"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            disabled={isEditing}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(comment)}
                              disabled={isEditing || !editContent.trim()}
                            >
                              {isEditing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              <span className="ml-2">Save</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingId(null)}
                              disabled={isEditing}
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

                    {canModerateComments && editingId !== comment._id && (
                      <div className="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500! hover:text-(--brand-from)! dark:text-gray-400! dark:hover:text-(--brand-focus)!"
                          onClick={() => handleEdit(comment)}
                          disabled={isEditing}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500! hover:text-red-500! dark:text-gray-400! dark:hover:text-red-400!"
                          onClick={() => handleDelete(comment._id)}
                          disabled={!!deletingCommentId}
                        >
                          {deletingCommentId === comment._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comments;

// src/components/leads/leadDetailsPanel/commentsAndActivities/CommentForm.tsx
"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, ChevronUp, Type } from "lucide-react";
import { TEXTAREA_TOGGLE_KEY } from "./utils";

interface CommentFormProps {
  commentContent: string;
  setCommentContent: (content: string) => void;
  showTextarea: boolean;
  setShowTextarea: (show: boolean) => void;
  onAddComment: () => void;
  isSaving: boolean;
}

export const CommentForm: FC<CommentFormProps> = ({
  commentContent,
  setCommentContent,
  showTextarea,
  setShowTextarea,
  onAddComment,
  isSaving,
}) => {
  const handleToggleTextarea = () => {
    const newState = !showTextarea;
    setShowTextarea(newState);
    localStorage.setItem(TEXTAREA_TOGGLE_KEY, JSON.stringify(newState));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      if (!isSaving && commentContent.trim()) {
        e.preventDefault();
        onAddComment();
      }
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800! dark:text-white!">
          Comment
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

      {/* Add Comment Textarea */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          showTextarea
            ? "max-h-36 opacity-100 sm:max-h-96"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="mb-4 space-y-2 sm:mb-6 sm:space-y-3">
          <textarea
            placeholder="Write your thoughts about this lead... (Press Cmd/Ctrl + Enter to submit)"
            className="w-full p-3 rounded-md focus:outline-none resize-none min-h-20 sm:min-h-30 text-gray-700! dark:text-white! bg-white dark:bg-gray-700/50 transition-all duration-200 border border-gray-300 dark:border-gray-600 focus:border-(--brand-focus) focus:ring-0"
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            rows={3}
          />
          <div className="flex justify-end pt-1">
            <button
              onClick={onAddComment}
              disabled={isSaving || !commentContent.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 brand-gradient hover:brightness-95 text-white! rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 focus:border-(--brand-focus) disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Commenting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Comment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

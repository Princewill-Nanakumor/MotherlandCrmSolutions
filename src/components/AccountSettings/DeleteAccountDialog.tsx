// src/components/AccountSettings/DeleteAccountDialog.tsx
"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";

export function DeleteAccountDialog({
  open,
  onClose,
  onDelete,
  isDeleting,
  deletePassword,
  setDeletePassword,
  showDeletePassword,
  setShowDeletePassword,
  deleteError,
  PasswordInput,
}: {
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  deletePassword: string;
  setDeletePassword: (v: string) => void;
  showDeletePassword: boolean;
  setShowDeletePassword: (v: boolean) => void;
  deleteError: string;
  PasswordInput: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    showPassword: boolean;
    onTogglePassword: () => void;
    error?: string;
  }>;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50 backdrop-blur-sm bg-transparent">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Delete Account
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              This will permanently delete your account and remove all your data
              from our servers. Please enter your password to confirm this
              action.
            </p>
          </div>
          <div className="space-y-4">
            <PasswordInput
              id="delete-password"
              label="Confirm Password"
              value={deletePassword}
              onChange={setDeletePassword}
              placeholder="Enter your password"
              showPassword={showDeletePassword}
              onTogglePassword={() =>
                setShowDeletePassword(!showDeletePassword)
              }
              error={deleteError}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting || !deletePassword.trim()}
                className="flex-1 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

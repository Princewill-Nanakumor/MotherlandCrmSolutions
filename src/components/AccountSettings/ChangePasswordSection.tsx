// src/components/AccountSettings/ChangePasswordSection.tsx
"use client";
import React from "react";
import { Key, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "./PasswordInput";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ChangePasswordSection({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isResettingPassword,
  passwordError,
  fieldErrors,
  handlePasswordReset,
}: {
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showCurrentPassword: boolean;
  setShowCurrentPassword: (v: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  isResettingPassword: boolean;
  passwordError: string | null;
  fieldErrors: FieldErrors;
  handlePasswordReset: () => void;
}) {
  return (
    <section className="p-6 bg-white border shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl border-border ">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
          <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900! dark:text-white!">
            Change Password
          </h2>
          <p className="text-sm text-gray-500 dark:text-white!">
            Update your account password
          </p>
        </div>
      </div>
      {passwordError && (
        <div className="p-3 mb-2 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            {passwordError}
          </p>
        </div>
      )}
      <div className="space-y-4">
        <PasswordInput
          id="current-password"
          label="Current Password"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Enter current password"
          showPassword={showCurrentPassword}
          onTogglePassword={() => setShowCurrentPassword(!showCurrentPassword)}
          error={fieldErrors.currentPassword}
          disabled={isResettingPassword}
        />
        <PasswordInput
          id="new-password"
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Enter new password"
          showPassword={showNewPassword}
          onTogglePassword={() => setShowNewPassword(!showNewPassword)}
          error={fieldErrors.newPassword}
          disabled={isResettingPassword}
        />
        <PasswordInput
          id="confirm-password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Confirm new password"
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
          error={fieldErrors.confirmPassword}
          disabled={isResettingPassword}
        />

        <Button
          onClick={handlePasswordReset}
          className="w-full text-white bg-linear-to-r from-indigo-600 to-purple-600"
          disabled={isResettingPassword}
        >
          {isResettingPassword ? (
            <>
              <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
              Updating Password...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Update Password
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

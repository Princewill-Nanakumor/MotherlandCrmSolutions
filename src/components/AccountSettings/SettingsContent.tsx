// src/components/AccountSettings/SettingsContent.tsx
"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { SettingsSidebar } from "./SettingsSidebar";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { ChangePasswordSection } from "./ChangePasswordSection";
import { PasswordInput } from "./PasswordInput";
import { DateTimeSettingsSection } from "./DateTimeSettingsSection";
import { DialerSettingsSection } from "./DialerSettingsSection";
import { AppearanceSettingsSection } from "./AppearanceSettingsSection";

export function SettingsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const userRole = session?.user?.role;

  // Password reset state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Account deletion state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handlePasswordReset = async () => {
    setPasswordError(null);
    setFieldErrors({});

    if (
      !currentPassword.trim() ||
      !newPassword.trim() ||
      !confirmPassword.trim()
    ) {
      setFieldErrors({
        currentPassword: !currentPassword.trim()
          ? "Current password is required"
          : undefined,
        newPassword: !newPassword.trim()
          ? "New password is required"
          : undefined,
        confirmPassword: !confirmPassword.trim()
          ? "Please confirm your new password"
          : undefined,
      });
      setPasswordError(null);
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "New passwords do not match" });
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else if (data.error) {
          setPasswordError(data.error);
        } else {
          setPasswordError("Failed to update password");
        }
        return;
      }

      toast({
        title: "Password Updated",
        description:
          "Your password has been successfully updated. Please log in again.",
        variant: "success",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        void signOutWithoutInterstitial("/", router, { intentional: true });
      }, 1500);
    } catch {
      setPasswordError("An error occurred while updating your password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError("Please enter your password");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/users/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });

      if (response.status === 401) {
        void signOutWithoutInterstitial("/", router, { intentional: true });
        return;
      }

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: "Your account has been successfully deleted.",
          variant: "success",
        });

        setTimeout(() => {
          void signOutWithoutInterstitial("/", router, { intentional: true });
        }, 2000);
      } else {
        setDeleteError(data.error || "Failed to delete account");
      }
    } catch {
      setDeleteError("An error occurred while deleting your account");
    } finally {
      setIsDeleting(false);
    }
  };

  if (userRole !== "ADMIN") {
    return (
      <div className="min-h-screen">
        <div className="container px-4 py-8 mx-auto border rounded-lg">
          <DateTimeSettingsSection />
          <DialerSettingsSection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container px-4 py-8 mx-auto border rounded-lg">
        {/* Header Section */}
        <div className="flex flex-col items-start mb-8 md:flex-row md:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900! dark:text-white!">
              Account Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your password and account security
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Password and Danger Zone */}
          <div className="space-y-6 lg:col-span-2">
            {/* Password Change Section */}
            <ChangePasswordSection
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              showNewPassword={showNewPassword}
              setShowNewPassword={setShowNewPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isResettingPassword={isResettingPassword}
              passwordError={passwordError}
              fieldErrors={fieldErrors}
              handlePasswordReset={handlePasswordReset}
            />
            <AppearanceSettingsSection />
            {/* Danger Zone Section */}
            <section className="p-6 bg-white border border-red-200 shadow-lg dark:backdrop-blur-lg dark:bg-white/5 rounded-2xl dark:border dark:border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                    Danger Zone
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-white!">
                    Irreversible account actions
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Warning:</strong> Once you delete your account,
                    there is no going back. This action will permanently remove
                    all your data and cannot be undone.
                  </p>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-2"
                >
                  <UserX className="w-4 h-4" />
                  Delete Account
                </Button>
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar and Date Settings */}
          <div>
            <SettingsSidebar />
            <DateTimeSettingsSection />
            <DialerSettingsSection />
          </div>
        </div>

        {/* Delete Account Dialog */}
        <DeleteAccountDialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDeletePassword("");
            setDeleteError("");
          }}
          onDelete={handleDeleteAccount}
          isDeleting={isDeleting}
          deletePassword={deletePassword}
          setDeletePassword={setDeletePassword}
          showDeletePassword={showDeletePassword}
          setShowDeletePassword={setShowDeletePassword}
          deleteError={deleteError}
          PasswordInput={PasswordInput}
        />
      </div>
    </div>
  );
}

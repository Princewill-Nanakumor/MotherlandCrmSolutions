// src/components/user-management/UserManagement.tsx
"use client";
import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, PlusIcon } from "lucide-react";
import { UserFormModal } from "./UserFormModal";
import { PasswordResetModal } from "../dashboardComponents/PasswordResetModal";
import { UserCRUDOperations } from "@/components/user-management/UserCRUDOperations";
import { UserTableDisplay } from "@/components/user-management/UserTableDisplay";
import { AuthGuard } from "@/components/user-management/AuthGuard";
import UsageLimitsDisplay from "./UsageLimitsDisplay";
import { useUserUsageData } from "@/hooks/useUserUsageData";
import { useUsersData } from "@/hooks/useUsersData";
import { UserDetailsModal } from "./UserDetailsModal";
import { CallLogsModal } from "./CallLogsModal";
import { User } from "./UserTableColumns";
import type { UserFormCreateData } from "@/schemas/UserFormSchema";
import { ShieldSpinnerGlyph } from "@/components/dashboardComponents/LeadsLoadingState";
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

interface UsersManagementProps {
  onUserDeleted?: (userId: string) => void;
  onUserCreated?: (user: User) => void;
  onUserUpdated?: (user: User) => void;
  showCreateButton?: boolean;
  showActions?: boolean;
  filterActiveOnly?: boolean;
}

export default function UsersManagement({
  onUserDeleted,
  onUserCreated,
  onUserUpdated,
  showCreateButton = true,
  showActions = true,
  filterActiveOnly = true,
}: UsersManagementProps) {
  const { status } = useSession();
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCallLogsModal, setShowCallLogsModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] =
    useState<User | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] =
    useState<User | null>(null);
  const [selectedUserForCallLogs, setSelectedUserForCallLogs] =
    useState<User | null>(null);
  const [showUsageLimit, setShowUsageLimit] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Use React Query for user data
  const {
    data: users = [],
    isLoading: usersLoading,
    isFetching: usersFetching,
    refetch: refetchUsers,
  } = useUsersData();

  // Use React Query for user usage data
  const {
    userUsageData,
    isLoading: usageDataLoading,
    refreshUserUsageData,
  } = useUserUsageData();

  const handleUserCreated = useCallback(
    (user: User) => {
      onUserCreated?.(user);
      refetchUsers(); // Refetch users after creation
      refreshUserUsageData(); // Refetch usage immediately
      setShowModal(false);
    },
    [onUserCreated, refetchUsers, refreshUserUsageData],
  );

  const handleUserUpdated = useCallback(
    (user: User) => {
      onUserUpdated?.(user);
      refetchUsers(); // Refetch users after update
      refreshUserUsageData(); // Keep usage in sync if role/status changes matter
    },
    [onUserUpdated, refetchUsers, refreshUserUsageData],
  );

  const handleUserDeleted = useCallback(
    (userId: string) => {
      onUserDeleted?.(userId);
      refetchUsers(); // Refetch users after deletion
      refreshUserUsageData(); // Refetch usage immediately
    },
    [onUserDeleted, refetchUsers, refreshUserUsageData],
  );

  const handleCreateUserClick = useCallback(() => {
    if (userUsageData && !userUsageData.canAddTeamMember) {
      setShowUsageLimit(true);
      return;
    }
    setShowModal(true);
  }, [userUsageData]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <ShieldSpinnerGlyph />
      </div>
    );
  }

  return (
    <AuthGuard>
      <UserCRUDOperations
        onUserCreated={handleUserCreated}
        onUserUpdated={handleUserUpdated}
        onUserDeleted={handleUserDeleted}
        onRefreshUsers={refetchUsers}
      >
        {({
          handleCreateUser,
          handleUpdateUser,
          handleDeleteUser,
          handleResetPassword,
          isUpdating,
        }) => {
          const requestDeleteUser = (user: User) => {
            if (deletingUserId) return;
            setPendingDeleteUser(user);
          };

          const confirmDeleteUser = async () => {
            if (!pendingDeleteUser || deletingUserId) return;
            setDeletingUserId(pendingDeleteUser.id);
            try {
              await handleDeleteUser(pendingDeleteUser.id);
              setPendingDeleteUser(null);
            } finally {
              setDeletingUserId(null);
            }
          };

          return (
          <div className="p-6 space-y-6 border rounded bg-background dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900! dark:text-white!">
                  User Management
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create and manage user accounts for your organization
                </p>
              </div>
              {showCreateButton && (
                <div className="flex items-center gap-2">
                  {usageDataLoading ? (
                    // Loading skeleton for the button
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-md dark:bg-gray-700 animate-pulse">
                      <div className="w-4 h-4 bg-gray-300 rounded dark:bg-gray-600"></div>
                      <div className="w-20 h-4 bg-gray-300 rounded dark:bg-gray-600"></div>
                    </div>
                  ) : (
                    <Button
                      className="bg-linear-to-r from-indigo-600 to-purple-600 text-white!"
                      onClick={handleCreateUserClick}
                      disabled={
                        !!(userUsageData && !userUsageData.canAddTeamMember)
                      }
                    >
                      <PlusIcon className="w-4 h-4" />
                      Create User
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Usage Limits Display - Now uses React Query */}
            <UsageLimitsDisplay
              showUsageLimit={showUsageLimit}
              onShowUsageLimit={setShowUsageLimit}
            />

            <UserTableDisplay
              users={users}
              loading={usersLoading || (usersFetching && users.length === 0)}
              filterActiveOnly={filterActiveOnly}
              showActions={showActions}
              deletingUserId={deletingUserId}
              onViewDetails={(user) => {
                setSelectedUserForDetails(user);
                setShowDetailsModal(true);
              }}
              onViewCallLogs={(user) => {
                setSelectedUserForCallLogs(user);
                setShowCallLogsModal(true);
              }}
              onDeleteUser={requestDeleteUser}
              onResetPassword={(userId) => {
                const user = users.find((u) => u.id === userId);
                if (user) {
                  setSelectedUserForPassword(user);
                  setShowPasswordModal(true);
                }
              }}
            />

            <UserFormModal
              isOpen={showModal}
              onClose={() => {
                setShowModal(false);
              }}
              onSubmit={async (userData) => {
                try {
                  await handleCreateUser(userData as UserFormCreateData);
                } catch (error) {
                  console.error("Error in form submission:", error);
                  throw error;
                }
              }}
              initialData={undefined}
              mode="create"
              usageData={userUsageData}
            />

            <PasswordResetModal
              isOpen={showPasswordModal}
              onClose={() => {
                setShowPasswordModal(false);
                setSelectedUserForPassword(null);
              }}
              onSubmit={async (password) => {
                if (selectedUserForPassword) {
                  await handleResetPassword(
                    selectedUserForPassword.id,
                    password,
                  );
                  setShowPasswordModal(false);
                  setSelectedUserForPassword(null);
                }
              }}
              userEmail={selectedUserForPassword?.email || ""}
            />

            <UserDetailsModal
              isOpen={showDetailsModal}
              onClose={() => {
                setShowDetailsModal(false);
                setSelectedUserForDetails(null);
              }}
              user={selectedUserForDetails}
              crudUpdatePending={isUpdating}
              onUserPersisted={(u) => {
                setSelectedUserForDetails(u);
                handleUserUpdated(u);
              }}
              onUpdate={async (userData, userId) => {
                try {
                  const updatedUser = await handleUpdateUser(userData, userId);
                  if (updatedUser) {
                    setSelectedUserForDetails(updatedUser as User);
                  }
                } catch (error) {
                  console.error("Error updating user:", error);
                  throw error;
                }
              }}
            />

            <CallLogsModal
              isOpen={showCallLogsModal}
              onClose={() => {
                setShowCallLogsModal(false);
                setSelectedUserForCallLogs(null);
              }}
              userId={selectedUserForCallLogs?.id || ""}
              userName={
                selectedUserForCallLogs
                  ? `${selectedUserForCallLogs.firstName} ${selectedUserForCallLogs.lastName}`
                  : ""
              }
            />

            <AlertDialog
              open={pendingDeleteUser !== null}
              onOpenChange={(open) => {
                if (!open && !deletingUserId) {
                  setPendingDeleteUser(null);
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        This cannot be undone. The user will be permanently
                        deleted and all leads assigned to them will be
                        unassigned.
                      </p>
                      {pendingDeleteUser ? (
                        <p className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded-md border border-gray-200 dark:border-gray-600 dark:bg-transparent dark:text-gray-200">
                          {pendingDeleteUser.firstName}{" "}
                          {pendingDeleteUser.lastName}
                          {pendingDeleteUser.email
                            ? ` · ${pendingDeleteUser.email}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={!!deletingUserId}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="text-white bg-red-600 hover:bg-red-700 hover:text-white focus:ring-red-600"
                    disabled={!!deletingUserId}
                    onClick={(e) => {
                      e.preventDefault();
                      void confirmDeleteUser();
                    }}
                  >
                    {deletingUserId ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Deleting…
                      </>
                    ) : (
                      "Delete user"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          );
        }}
      </UserCRUDOperations>
    </AuthGuard>
  );
}

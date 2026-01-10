// src/components/user-management/UserManagement.tsx
"use client";
import { useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, Shield } from "lucide-react";
import { UserFormModal } from "./UserFormModal";
import { PasswordResetModal } from "../dashboardComponents/PasswordRestModal";
import { UserCRUDOperations } from "@/components/user-management/UserCRUDOperations";
import { UserTableDisplay } from "@/components/user-management/UserTableDisplay";
import { AuthGuard } from "@/components/user-management/AuthGuard";
import UsageLimitsDisplay from "./UsageLimitsDisplay";
import { useUserUsageData } from "@/hooks/useUserUsageData";
import { useUsersData } from "@/hooks/useUsersData";
import { UserDetailsModal } from "./UserDetailsModal";
import { CallLogsModal } from "./CallLogsModal";
import { User } from "./UserTableColumns";

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
    [onUserCreated, refetchUsers, refreshUserUsageData]
  );

  const handleUserUpdated = useCallback(
    (user: User) => {
      onUserUpdated?.(user);
      refetchUsers(); // Refetch users after update
      refreshUserUsageData(); // Keep usage in sync if role/status changes matter
    },
    [onUserUpdated, refetchUsers, refreshUserUsageData]
  );

  const handleUserDeleted = useCallback(
    (userId: string) => {
      onUserDeleted?.(userId);
      refetchUsers(); // Refetch users after deletion
      refreshUserUsageData(); // Refetch usage immediately
    },
    [onUserDeleted, refetchUsers, refreshUserUsageData]
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
      <div className="flex justify-center items-center h-screen">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-500 rounded-full animate-spin w-16 h-16"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
            <Shield size={28} className="text-white" />
          </div>
        </div>
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
        }) => (
          <div className="space-y-6 p-6 bg-background dark:bg-gray-800 rounded border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold !text-gray-900 dark:!text-white">
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
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse">
                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="w-20 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  ) : (
                    <Button
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 !text-white"
                      onClick={handleCreateUserClick}
                      disabled={
                        !!(userUsageData && !userUsageData.canAddTeamMember)
                      }
                    >
                      <PlusIcon className="h-4 w-4" />
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
              onViewDetails={(user) => {
                setSelectedUserForDetails(user);
                setShowDetailsModal(true);
              }}
              onViewCallLogs={(user) => {
                setSelectedUserForCallLogs(user);
                setShowCallLogsModal(true);
              }}
              onDeleteUser={handleDeleteUser}
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
                  await handleCreateUser(userData);
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
                    password
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
              onUpdate={async (userData, userId) => {
                try {
                  const updatedUser = await handleUpdateUser(userData, userId);
                  // Update the selected user in the modal to reflect changes immediately
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
          </div>
        )}
      </UserCRUDOperations>
    </AuthGuard>
  );
}

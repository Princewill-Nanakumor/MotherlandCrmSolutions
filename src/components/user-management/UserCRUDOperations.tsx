// src/components/user-management/UserCRUDOperations.tsx
"use client";

import { useCallback } from "react";
import type { User } from "@/components/user-management/UserTableColumns";
import type { UserFormCreateData, UserFormEditData } from "@/schemas/UserFormSchema";
import { useUserMutations } from "@/hooks/useUserMutations";

interface UserCRUDOperationsProps {
  onUserCreated?: (user: User) => void;
  onUserUpdated?: (user: User) => void;
  onUserDeleted?: (userId: string) => void;
  onRefreshUsers: () => void;
  children: (operations: {
    handleCreateUser: (userData: UserFormCreateData) => Promise<User>;
    handleUpdateUser: (
      userData: UserFormEditData,
      userId: string,
    ) => Promise<User>;
    handleDeleteUser: (userId: string) => Promise<void>;
    handleResetPassword: (userId: string, password: string) => Promise<void>;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    isResettingPassword: boolean;
  }) => React.ReactNode;
}

export function UserCRUDOperations({
  onUserCreated,
  onUserUpdated,
  onUserDeleted,
  onRefreshUsers,
  children,
}: UserCRUDOperationsProps) {
  const {
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    isCreating,
    isUpdating,
    isDeleting,
    isResettingPassword,
  } = useUserMutations({
    onUserCreated,
    onUserUpdated,
    onUserDeleted,
    onRefreshUsers,
  });

  const handleCreateUser = useCallback(
    (userData: UserFormCreateData) => createUser.mutateAsync(userData),
    [createUser],
  );

  const handleUpdateUser = useCallback(
    (userData: UserFormEditData, userId: string) =>
      updateUser.mutateAsync({ userId, body: userData }),
    [updateUser],
  );

  const handleDeleteUser = useCallback(
    async (userId: string): Promise<void> => {
      if (
        !confirm(
          "Are you sure you want to PERMANENTLY delete this user? This action cannot be undone and will unassign all leads from this user.",
        )
      ) {
        return;
      }
      await deleteUser.mutateAsync(userId);
    },
    [deleteUser],
  );

  const handleResetPassword = useCallback(
    (userId: string, password: string) =>
      resetPassword.mutateAsync({ userId, password }),
    [resetPassword],
  );

  return (
    <>
      {children({
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        handleResetPassword,
        isCreating,
        isUpdating,
        isDeleting,
        isResettingPassword,
      })}
    </>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type { User } from "@/components/user-management/UserTableColumns";
import type { UserFormCreateData, UserFormEditData } from "@/schemas/UserFormSchema";

export type UserUpdateBody = UserFormEditData & {
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
};

export type UpdateUserVariables = { userId: string; body: UserUpdateBody };

export async function updateUserRequest(
  userId: string,
  body: UserUpdateBody,
): Promise<User> {
  const response = await fetch(`/api/users`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id: userId, ...body }),
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.error && typeof data.error === "object") throw data.error;
    if (data.error && typeof data.error === "string")
      throw { message: data.error };
    if (data.message) throw { message: data.message };
    throw { message: "Failed to update user" };
  }

  const updated = data.data || data.user;
  if (!updated) throw { message: "No user data returned from server." };
  return updated as User;
}

export async function invalidateUserCachesAfterWrite(
  queryClient: QueryClient,
  options?: { includeCurrentUserPermission?: boolean },
) {
  const tasks: Promise<unknown>[] = [
    queryClient.invalidateQueries({ queryKey: ["users"] }),
    queryClient.invalidateQueries({ queryKey: ["user-usage-data"] }),
    queryClient.refetchQueries({ queryKey: ["users"] }),
  ];
  if (options?.includeCurrentUserPermission) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: ["current-user-permission"],
      }),
    );
  }
  await Promise.all(tasks);
}

export interface UseUserMutationsOptions {
  onUserCreated?: (user: User) => void;
  onUserUpdated?: (user: User) => void;
  onUserDeleted?: (userId: string) => void;
  onRefreshUsers?: () => void | Promise<void>;
}

export function useUserMutations({
  onUserCreated,
  onUserUpdated,
  onUserDeleted,
  onRefreshUsers,
}: UseUserMutationsOptions = {}) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: async (userData: UserFormCreateData): Promise<User> => {
      if (!session?.user?.id) {
        throw { message: "User session not found. Please log in again." };
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...userData,
          createdBy: session.user.id,
          status: "ACTIVE",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.upgradeRequired) {
          throw {
            message:
              data.message ||
              "Team member limit reached. Please upgrade your subscription.",
            upgradeRequired: true,
          };
        }
        if (response.status === 409) {
          throw {
            field: "email",
            message: data.message || "This email address is already in use.",
          };
        }
        if (response.status === 400)
          throw { message: data.message || "Invalid user data." };
        if (response.status === 401)
          throw { message: "You are not authorized to create users." };
        throw {
          message:
            data.message || "Something went wrong while creating the user.",
        };
      }

      return data.user as User;
    },
    onSuccess: async (created) => {
      toast({
        title: "Success",
        description: "User created successfully",
        variant: "success",
      });
      await invalidateUserCachesAfterWrite(queryClient);
      await onRefreshUsers?.();
      onUserCreated?.(created);
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, body }: UpdateUserVariables) =>
      updateUserRequest(userId, body),
    onSuccess: async (updated) => {
      toast({
        title: "Success",
        description: "User updated successfully",
        variant: "success",
      });
      await invalidateUserCachesAfterWrite(queryClient, {
        includeCurrentUserPermission: true,
      });
      await onRefreshUsers?.();
      onUserUpdated?.(updated);
    },
    onError: (error: unknown) => {
      console.error("Update user error details:", error);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
    },
    onSuccess: async (_void, userId) => {
      await invalidateUserCachesAfterWrite(queryClient);
      onRefreshUsers?.();
      toast({
        title: "Success",
        description: "User permanently deleted successfully",
        variant: "success",
      });
      onUserDeleted?.(userId);
    },
    onError: (error: unknown) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const resetPassword = useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string;
      password: string;
    }) => {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password has been reset successfully",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  return {
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    isCreating: createUser.isPending,
    isUpdating: updateUser.isPending,
    isDeleting: deleteUser.isPending,
    isResettingPassword: resetPassword.isPending,
  };
}

"use client";

import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { User } from "@/components/user-management/UserTableColumns";
import type { UserFormCreateData, UserFormEditData } from "@/schemas/UserFormSchema";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

export type UserUpdateBody = UserFormEditData & {
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
};

export type UpdateUserVariables = { userId: string; body: UserUpdateBody };

export async function updateUserRequest(
  userId: string,
  body: UserUpdateBody,
): Promise<User> {
  const response = await apiCallWithSessionRefresh(`/api/users`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: userId, ...body }),
    cache: "no-store",
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

  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormCreateData): Promise<User> => {
      if (!session?.user?.id) {
        throw { message: "User session not found. Please log in again." };
      }

      const response = await apiCallWithSessionRefresh("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userData,
          createdBy: session.user.id,
          status: "ACTIVE",
        }),
        cache: "no-store",
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
  });

  const createUser = {
    ...createUserMutation,
    mutateAsync: async (userData: UserFormCreateData) => {
      const created = await createUserMutation.mutateAsync(userData);
      // Toast / UI first — don't block modal close on list refetch.
      onUserCreated?.(created);
      // Optimistic row so the table updates without waiting on GET /api/users.
      queryClient.setQueryData<User[]>(["users"], (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        if (list.some((u) => u.id === created.id || u.email === created.email)) {
          return list;
        }
        return [created, ...list];
      });
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-usage-data"] }),
        // Mark users stale; background refetch must not gate the create UX.
        queryClient.invalidateQueries({ queryKey: ["users"] }),
      ]).catch((err) => {
        console.error("Post-create users cache refresh failed:", err);
      });
      return created;
    },
  } satisfies UseMutationResult<User, unknown, UserFormCreateData>;

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, body }: UpdateUserVariables) =>
      updateUserRequest(userId, body),
  });

  const updateUser = {
    ...updateUserMutation,
    mutateAsync: async (variables: UpdateUserVariables) => {
      try {
        const updated = await updateUserMutation.mutateAsync(variables);
        await invalidateUserCachesAfterWrite(queryClient, {
          includeCurrentUserPermission: true,
        });
        await onRefreshUsers?.();
        onUserUpdated?.(updated);
        return updated;
      } catch (error: unknown) {
        console.error("Update user error details:", error);
        throw error;
      }
    },
  } satisfies UseMutationResult<User, unknown, UpdateUserVariables>;

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiCallWithSessionRefresh(
        `/api/users?id=${userId}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
    },
  });

  const deleteUser = {
    ...deleteUserMutation,
    mutateAsync: async (userId: string) => {
      try {
        await deleteUserMutation.mutateAsync(userId);
        await invalidateUserCachesAfterWrite(queryClient);
        await onRefreshUsers?.();
        toast({
          title: "Success",
          description: "User permanently deleted successfully",
          variant: "success",
        });
        onUserDeleted?.(userId);
      } catch (error: unknown) {
        console.error("Error deleting user:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to delete user",
          variant: "destructive",
        });
        throw error;
      }
    },
  } satisfies UseMutationResult<void, unknown, string>;

  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string;
      password: string;
    }) => {
      const response = await apiCallWithSessionRefresh(
        `/api/users/${userId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reset password");
      }
    },
  });

  const resetPassword = {
    ...resetPasswordMutation,
    mutateAsync: async (variables: { userId: string; password: string }) => {
      try {
        await resetPasswordMutation.mutateAsync(variables);
        toast({
          title: "Success",
          description: "Password has been reset successfully",
          variant: "success",
        });
      } catch (error: unknown) {
        console.error("Error resetting password:", error);
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to reset password",
          variant: "destructive",
        });
        throw error;
      }
    },
  } satisfies UseMutationResult<
    void,
    unknown,
    { userId: string; password: string }
  >;

  return {
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
  };
}

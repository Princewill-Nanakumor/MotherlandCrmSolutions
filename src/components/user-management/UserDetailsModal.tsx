// src/components/user-management/UserDetailsModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { UserDetailsView } from "./UserDetailsView";
import { UserDetailsEditForm } from "./UserDetailsEditForm";
import { SelectOption, countryOptions } from "./CountrySelect";
import { UserFormEditSchema, UserFormEditData } from "@/schemas/UserFormSchema";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useSession } from "next-auth/react";
import type { User } from "./UserTableColumns";
import {
  updateUserRequest,
  invalidateUserCachesAfterWrite,
  type UserUpdateBody,
  type UpdateUserVariables,
} from "@/hooks/useUserMutations";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate?: (
    userData: UserFormEditData & {
      canViewPhoneNumbers?: boolean;
      canViewEmails?: boolean;
    },
    userId: string,
  ) => Promise<void>;
  /** Called after visibility toggles persist so parent can sync selection and usage. */
  onUserPersisted?: (user: User) => void;
  /** True while the shared CRUD update mutation (form save) is in flight. */
  crudUpdatePending?: boolean;
}

function buildVisibilityUpdateBody(
  u: User,
  patch: Partial<Pick<User, "canViewPhoneNumbers" | "canViewEmails">>,
): UserUpdateBody {
  return {
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    password: "",
    phoneNumber: u.phoneNumber || "",
    country: u.country || "",
    role: u.role,
    status: u.status,
    permissions: u.permissions || [],
    canViewPhoneNumbers:
      patch.canViewPhoneNumbers ?? u.canViewPhoneNumbers ?? false,
    canViewEmails: patch.canViewEmails ?? u.canViewEmails ?? false,
  };
}

export function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onUpdate,
  onUserPersisted,
  crudUpdatePending = false,
}: UserDetailsModalProps) {
  const queryClient = useQueryClient();
  const { data: session, update: updateSession } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const isUpdatingOwnProfile = session?.user?.id === user?.id;
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localUser, setLocalUser] = useState<User | null>(user);
  const [formData, setFormData] = useState<UserFormEditData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phoneNumber: "",
    country: "",
    role: "AGENT",
    status: "ACTIVE",
    permissions: [],
  });
  const [selectedCountry, setSelectedCountry] = useState<SelectOption | null>(
    null,
  );

  const {
    generalError,
    validateForm,
    handleError,
    clearErrors,
    getFieldError,
  } = useFormValidation({
    createSchema: UserFormEditSchema,
    editSchema: UserFormEditSchema,
    mode: "edit",
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ userId, body }: UpdateUserVariables) =>
      updateUserRequest(userId, body),
    onMutate: async ({ body }) => {
      if (!localUser) return { previousLocalUser: null as User | null };
      const previousLocalUser = localUser;
      setLocalUser({
        ...localUser,
        canViewPhoneNumbers:
          body.canViewPhoneNumbers ?? localUser.canViewPhoneNumbers,
        canViewEmails: body.canViewEmails ?? localUser.canViewEmails,
      });
      return { previousLocalUser };
    },
    onError: (error, _vars, context) => {
      const previous = context?.previousLocalUser;
      if (previous) setLocalUser(previous);
      else if (user) setLocalUser(user);
      handleError(error);
    },
    onSuccess: async (updatedUser, variables) => {
      setLocalUser(updatedUser);
      await invalidateUserCachesAfterWrite(queryClient, {
        includeCurrentUserPermission: true,
      });
      onUserPersisted?.(updatedUser);

      if (isUpdatingOwnProfile && updateSession) {
        await updateSession({
          user: {
            ...session?.user,
            canViewPhoneNumbers:
              variables.body.canViewPhoneNumbers ??
              updatedUser.canViewPhoneNumbers ??
              false,
            canViewEmails:
              variables.body.canViewEmails ??
              updatedUser.canViewEmails ??
              false,
          },
        });
      }
    },
  });

  // Initialize form data when user changes
  useEffect(() => {
    if (user && isOpen) {
      setLocalUser(user);
      const phoneNumber = user.phoneNumber || "";
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: "",
        phoneNumber,
        country: user.country || "",
        role: user.role,
        status: user.status,
        permissions: user.permissions || [],
      } as UserFormEditData);
      const countryOption = countryOptions.find(
        (opt) => opt.label === user.country,
      );
      setSelectedCountry(countryOption || null);
      setIsEditing(false);
      clearErrors();
    }
  }, [user, isOpen, clearErrors]);

  const handleInputChange = useCallback(
    (field: keyof UserFormEditData, value: string | string[]) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [],
  );

  const handleCountryChange = useCallback((option: SelectOption | null) => {
    setSelectedCountry(option);
    setFormData((prev) => ({
      ...prev,
      country: option?.label || "",
    }));
  }, []);

  const handlePhoneChange = useCallback((value?: string) => {
    setFormData((prev) => ({
      ...prev,
      phoneNumber: value || "",
    }));
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    clearErrors();
  };

  const handleCancel = () => {
    if (user) {
      const phoneNumber = user.phoneNumber || "";
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: "",
        phoneNumber,
        country: user.country || "",
        role: user.role,
        status: user.status,
        permissions: user.permissions || [],
      } as UserFormEditData);
      const countryOption = countryOptions.find(
        (opt) => opt.label === user.country,
      );
      setSelectedCountry(countryOption || null);
    }
    setIsEditing(false);
    clearErrors();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayUser || !onUpdate) return;

    if (!validateForm(formData)) return;
    if (isLoading || crudUpdatePending) return;

    setIsLoading(true);
    clearErrors();

    try {
      await onUpdate(formData, displayUser.id);
      setIsEditing(false);
    } catch (error: unknown) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePhoneVisibility = useCallback(() => {
    if (!localUser || visibilityMutation.isPending || !isAdmin) return;

    const newValue = !(localUser.canViewPhoneNumbers === true);
    visibilityMutation.mutate({
      userId: localUser.id,
      body: buildVisibilityUpdateBody(localUser, {
        canViewPhoneNumbers: newValue,
      }),
    });
  }, [localUser, visibilityMutation, isAdmin]);

  const handleToggleEmailVisibility = useCallback(() => {
    if (!localUser || visibilityMutation.isPending || !isAdmin) return;

    const newValue = !(localUser.canViewEmails === true);
    visibilityMutation.mutate({
      userId: localUser.id,
      body: buildVisibilityUpdateBody(localUser, {
        canViewEmails: newValue,
      }),
    });
  }, [localUser, visibilityMutation, isAdmin]);

  const displayUser = localUser || user;
  if (!displayUser) return null;

  const editFormBusy = isLoading || crudUpdatePending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              User Details
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2 dark:text-white dark:border-gray-600"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {isEditing ? (
          <UserDetailsEditForm
            user={displayUser}
            formData={formData}
            selectedCountry={selectedCountry}
            isLoading={editFormBusy}
            generalError={generalError}
            getFieldError={getFieldError}
            onInputChange={handleInputChange}
            onCountryChange={handleCountryChange}
            onPhoneChange={handlePhoneChange}
            onCancel={handleCancel}
            onSave={handleSave}
          />
        ) : (
          <UserDetailsView
            user={displayUser}
            onTogglePhoneVisibility={
              isAdmin ? handleTogglePhoneVisibility : undefined
            }
            onToggleEmailVisibility={
              isAdmin ? handleToggleEmailVisibility : undefined
            }
            isAdmin={isAdmin}
            isVisibilitySaving={visibilityMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

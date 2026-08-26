// src/components/user-management/UserDetailsModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { useToast } from "@/components/ui/use-toast";

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

function toEditFormData(user: User): UserFormEditData {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "",
    phoneNumber: user.phoneNumber || "",
    country: user.country || "",
    role: (user.role === "SUBADMIN" || user.role === "ADMIN"
      ? user.role
      : "AGENT") as UserFormEditData["role"],
    status: user.status,
    permissions: user.permissions || [],
    canViewEmails: user.canViewEmails === true,
    canViewPhoneNumbers: user.canViewPhoneNumbers === true,
  };
}

export function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onUpdate,
  crudUpdatePending = false,
}: UserDetailsModalProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === "ADMIN";
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
    canViewEmails: false,
    canViewPhoneNumbers: false,
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

  // Initialize form data when user changes
  useEffect(() => {
    if (user && isOpen) {
      setLocalUser(user);
      setFormData(toEditFormData(user));
      const countryOption = countryOptions.find(
        (opt) => opt.label === user.country,
      );
      setSelectedCountry(countryOption || null);
      setIsEditing(false);
      clearErrors();
    }
  }, [user, isOpen, clearErrors]);

  const handleInputChange = useCallback(
    (field: keyof UserFormEditData, value: string | string[] | boolean) => {
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
    if (localUser || user) {
      const source = localUser || user!;
      setFormData(toEditFormData(source));
      const countryOption = countryOptions.find(
        (opt) => opt.label === source.country,
      );
      setSelectedCountry(countryOption || null);
    }
    setIsEditing(true);
    clearErrors();
  };

  const handleCancel = () => {
    if (user) {
      setFormData(toEditFormData(localUser || user));
      const countryOption = countryOptions.find(
        (opt) => opt.label === (localUser || user).country,
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
      await onUpdate(
        {
          ...formData,
          canViewEmails: formData.canViewEmails === true,
          canViewPhoneNumbers: formData.canViewPhoneNumbers === true,
        },
        displayUser.id,
      );
      setLocalUser((prev) =>
        prev
          ? {
              ...prev,
              ...formData,
              canViewEmails: formData.canViewEmails === true,
              canViewPhoneNumbers: formData.canViewPhoneNumbers === true,
            }
          : prev,
      );
      // Clear busy UI first, then toast — avoids "Saving…" overlapping success toast.
      setIsEditing(false);
      setIsLoading(false);
      toast({
        title: "Success",
        description: "User updated successfully",
        variant: "success",
      });
    } catch (error: unknown) {
      handleError(error);
      setIsLoading(false);
    }
  };

  const displayUser = localUser || user;
  if (!displayUser) return null;

  const editFormBusy = isLoading || crudUpdatePending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-10">
            <DialogTitle className="text-2xl font-bold text-gray-900! dark:text-gray-50!">
              User Details
            </DialogTitle>
            {!isEditing && (
              <Button
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2 border-transparent brand-gradient text-white! hover:brightness-95"
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
            allowRoleChange={isAdmin}
          />
        ) : (
          <UserDetailsView user={displayUser} isAdmin={isAdmin} />
        )}
      </DialogContent>
    </Dialog>
  );
}

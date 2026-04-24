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
import {
  SelectOption,
  countryOptions,
} from "./CountrySelect";
import { UserFormEditSchema, UserFormEditData } from "@/schemas/UserFormSchema";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
  canViewPhoneNumbers?: boolean;
  canViewEmails?: boolean;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate?: (userData: UserFormEditData & { canViewPhoneNumbers?: boolean; canViewEmails?: boolean }, userId: string) => Promise<void>;
}

export function UserDetailsModal({
  isOpen,
  onClose,
  user,
  onUpdate,
}: UserDetailsModalProps) {
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
    null
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
      let phoneNumber = user.phoneNumber || "";
      if (phoneNumber && !phoneNumber.startsWith("+")) {
        phoneNumber = "+" + phoneNumber;
      }
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: "", // Don't populate password
        phoneNumber,
        country: user.country || "",
        role: user.role,
        status: user.status,
        permissions: user.permissions || [],
      } as UserFormEditData);
      const countryOption = countryOptions.find(
        (opt) => opt.label === user.country
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
    []
  );

  const handleCountryChange = useCallback((option: SelectOption | null) => {
    setSelectedCountry(option);
    setFormData((prev) => ({
      ...prev,
      country: option?.label || "",
    }));
  }, []);

  const handlePhoneChange = useCallback((value?: string) => {
    if (!value || value.startsWith("+")) {
      setFormData((prev) => ({
        ...prev,
        phoneNumber: value || "",
      }));
    }
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    clearErrors();
  };

  const handleCancel = () => {
    if (user) {
      let phoneNumber = user.phoneNumber || "";
      if (phoneNumber && !phoneNumber.startsWith("+")) {
        phoneNumber = "+" + phoneNumber;
      }
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
        (opt) => opt.label === user.country
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
    if (isLoading) return;

    setIsLoading(true);
    clearErrors();

    try {
      await onUpdate(formData, displayUser.id);
      setIsEditing(false);
    } catch (error: unknown) {
      setIsLoading(false);
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePhoneVisibility = useCallback(async () => {
    if (!localUser || !onUpdate || isLoading || !isAdmin) return;

    const newValue = !(localUser.canViewPhoneNumbers === true);
    
    // Optimistically update local state for immediate UI feedback
    setLocalUser({ ...localUser, canViewPhoneNumbers: newValue });
    setIsLoading(true);

    try {
      const updateData = {
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        email: localUser.email,
        password: "",
        phoneNumber: localUser.phoneNumber || "",
        country: localUser.country || "",
        role: localUser.role,
        status: localUser.status,
        permissions: localUser.permissions || [],
        canViewPhoneNumbers: newValue,
        canViewEmails: localUser.canViewEmails ?? false,
      };
      await onUpdate(updateData as UserFormEditData & { canViewPhoneNumbers: boolean; canViewEmails?: boolean }, localUser.id);
      
      // If updating own profile, refresh the session so the change takes effect immediately
      if (isUpdatingOwnProfile && updateSession) {
        await updateSession({
          user: {
            ...session?.user,
            canViewPhoneNumbers: newValue,
            canViewEmails: localUser.canViewEmails ?? false,
          },
        });
      }
      
      // Note: The parent component (UserManagement) will update selectedUserForDetails
      // which will cause this modal to re-render with the updated user prop via useEffect
    } catch (error: unknown) {
      // Revert optimistic update on error
      setLocalUser(user);
      handleError(error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [localUser, user, onUpdate, isLoading, handleError, isAdmin, isUpdatingOwnProfile, updateSession, session?.user]);

  const handleToggleEmailVisibility = useCallback(async () => {
    if (!localUser || !onUpdate || isLoading || !isAdmin) return;

    const newValue = !(localUser.canViewEmails === true);
    
    // Optimistically update local state for immediate UI feedback
    setLocalUser({ ...localUser, canViewEmails: newValue });
    setIsLoading(true);

    try {
      const updateData = {
        firstName: localUser.firstName,
        lastName: localUser.lastName,
        email: localUser.email,
        password: "",
        phoneNumber: localUser.phoneNumber || "",
        country: localUser.country || "",
        role: localUser.role,
        status: localUser.status,
        permissions: localUser.permissions || [],
        canViewPhoneNumbers: localUser.canViewPhoneNumbers ?? false,
        canViewEmails: newValue,
      };
      await onUpdate(updateData as UserFormEditData & { canViewPhoneNumbers?: boolean; canViewEmails: boolean }, localUser.id);
      
      // If updating own profile, refresh the session so the change takes effect immediately
      if (isUpdatingOwnProfile && updateSession) {
        await updateSession({
          user: {
            ...session?.user,
            canViewPhoneNumbers: localUser.canViewPhoneNumbers ?? false,
            canViewEmails: newValue,
          },
        });
      }
      
      // Note: The parent component (UserManagement) will update selectedUserForDetails
      // which will cause this modal to re-render with the updated user prop via useEffect
    } catch (error: unknown) {
      // Revert optimistic update on error
      setLocalUser(user);
      handleError(error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [localUser, user, onUpdate, isLoading, handleError, isAdmin, isUpdatingOwnProfile, updateSession, session?.user]);

  const displayUser = localUser || user;
  if (!displayUser) return null;

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
            isLoading={isLoading}
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
            onTogglePhoneVisibility={isAdmin ? handleTogglePhoneVisibility : undefined}
            onToggleEmailVisibility={isAdmin ? handleToggleEmailVisibility : undefined}
            isAdmin={isAdmin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

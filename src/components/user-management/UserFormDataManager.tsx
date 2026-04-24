// src/components/user-management/UserFormDataManager.tsx
import { useState, useEffect } from "react";
import { UserFormCreateData, UserFormEditData } from "@/schemas/UserFormSchema";

interface ValidationError {
  field: string;
  message: string;
}

type UserFormData = UserFormCreateData | UserFormEditData;

interface UseUserFormDataProps {
  isOpen: boolean;
  initialData?: UserFormData;
}

export const useUserFormData = ({
  isOpen,
  initialData,
}: UseUserFormDataProps) => {
  const [formData, setFormData] = useState<UserFormData>({
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
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
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleInputChange = (
    field: keyof UserFormData,
    value: string | string[]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    const newPermissions = checked
      ? [...formData.permissions, permission]
      : formData.permissions.filter((p: string) => p !== permission);
    handleInputChange("permissions", newPermissions);
  };

  const setErrorsFromValidation = (validationErrors: ValidationError[]) => {
    const errorMap: Record<string, string> = {};
    validationErrors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);
  };

  const getFieldError = (field: string) => errors[field] || "";

  return {
    formData,
    errors,
    handleInputChange,
    handlePermissionChange,
    setErrorsFromValidation,
    getFieldError,
    setFormData,
  };
};

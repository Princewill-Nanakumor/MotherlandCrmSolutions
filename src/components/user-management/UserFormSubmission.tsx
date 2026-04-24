// src/components/user-management/UserFormSubmission.tsx
import { useState } from "react";
import {
  UserFormCreateSchema,
  UserFormEditSchema,
  UserFormCreateData,
  UserFormEditData,
} from "@/schemas/UserFormSchema";
import { z } from "zod";

interface ValidationError {
  field: string;
  message: string;
}

type UserFormData = UserFormCreateData | UserFormEditData;

interface UseUserFormSubmissionProps {
  formData: UserFormData;
  setErrorsFromValidation: (errors: ValidationError[]) => void;
  setGeneralError: (error: string | null) => void;
  onSubmit: (userData: UserFormData) => Promise<void>;
  onClose: () => void;
  mode: "create" | "edit";
}

export const useUserFormSubmission = ({
  formData,
  setErrorsFromValidation,
  setGeneralError,
  onSubmit,
  onClose,
  mode,
}: UseUserFormSubmissionProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    try {
      if (mode === "create") {
        UserFormCreateSchema.parse(formData);
      } else {
        UserFormEditSchema.parse(formData);
      }
      setErrorsFromValidation([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path[0] as string,
          message: err.message,
        }));
        setErrorsFromValidation(validationErrors);
      } else {
        setErrorsFromValidation([]);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (error: unknown) {
      if (error instanceof Error) {
        // If the error is about email, set as field error
        if (error.message.toLowerCase().includes("email")) {
          setErrorsFromValidation([{ field: "email", message: error.message }]);
        } else {
          setGeneralError(error.message);
        }
      } else {
        setGeneralError("An unexpected error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleSubmit,
  };
};

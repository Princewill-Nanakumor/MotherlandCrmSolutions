// src/components/user-management/UserFormModal.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { X, AlertCircle, Globe, AlertTriangle } from "lucide-react";
import { Country } from "react-phone-number-input";
import {
  Select,
  countryOptions,
  SelectOption,
  CustomOption,
  CustomSingleValue,
} from "./CountrySelect";
import {
  UserFormCreateSchema,
  UserFormEditSchema,
  UserFormCreateData,
  UserFormEditData,
} from "@/schemas/UserFormSchema";
import { NameFields } from "./NameFields";
import { EmailField } from "./EmailField";
import { PasswordField } from "./PasswordField";
import { useFormValidation } from "@/hooks/useFormValidation";
import { getCountrySelectStyles } from "./CountrySelectStyles";
import { PhoneInputField } from "./PhoneInputField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UsageData {
  currentUsers: number;
  maxUsers: number;
  remainingUsers: number;
  canAddTeamMember: boolean;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormCreateData | UserFormEditData) => Promise<void>;
  initialData?: UserFormEditData;
  mode: "create" | "edit";
  usageData?: UsageData | null;
}

export function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
  usageData,
}: UserFormModalProps) {
  const [formData, setFormData] = useState<
    UserFormCreateData | UserFormEditData
  >({
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
  const [isLoading, setIsLoading] = useState(false);

  const {
    generalError,
    validateForm,
    handleError,
    clearErrors,
    getFieldError,
  } = useFormValidation({
    createSchema: UserFormCreateSchema,
    editSchema: UserFormEditSchema,
    mode,
  });

  // Check if inputs should be disabled (when usage limit is reached in create mode)
  const shouldDisableInputs = Boolean(
    mode === "create" && usageData && !usageData.canAddTeamMember
  );

  // Memoize clearErrors to prevent infinite re-renders
  const memoizedClearErrors = useCallback(() => {
    clearErrors();
  }, [clearErrors]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let phoneNumber = initialData.phoneNumber || "";
        if (phoneNumber && !phoneNumber.startsWith("+")) {
          phoneNumber = "+" + phoneNumber;
        }
        setFormData({ ...initialData, phoneNumber });
        const countryOption = countryOptions.find(
          (opt) => opt.label === initialData.country
        );
        setSelectedCountry(countryOption || null);
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
        setSelectedCountry(null);
      }
      memoizedClearErrors();
      setIsLoading(false);
    }
  }, [isOpen, initialData, memoizedClearErrors]);

  const handleInputChange = (
    field: keyof (UserFormCreateData & UserFormEditData),
    value: string | string[]
  ) => {
    // Don't allow changes if inputs are disabled
    if (shouldDisableInputs) return;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCountryChange = (option: SelectOption | null) => {
    // Don't allow changes if inputs are disabled
    if (shouldDisableInputs) return;

    setSelectedCountry(option);
    handleInputChange("country", option?.label || "");
  };

  const handlePhoneChange = (value?: string) => {
    // Don't allow changes if inputs are disabled
    if (shouldDisableInputs) return;

    if (!value || value.startsWith("+")) {
      handleInputChange("phoneNumber", value || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formData)) return;
    if (isLoading) return;

    // Check usage limits for create mode
    if (mode === "create" && usageData && !usageData.canAddTeamMember) {
      handleError({
        message:
          "You have reached your team member limit. Please upgrade your subscription to add more team members.",
      });
      return;
    }

    setIsLoading(true);
    clearErrors();

    try {
      await onSubmit(formData);
      onClose();
    } catch (error: unknown) {
      setIsLoading(false);
      handleError(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold !text-gray-900 dark:!text-white">
              {mode === "create" ? "Add New User" : "Edit User"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 text-2xl font-bold transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Usage Limit Warning for Create Mode */}
          {mode === "create" && usageData && !usageData.canAddTeamMember && (
            <Card className="mb-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Team Member Limit Reached</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-red-700 dark:text-red-300">
                    You have reached your team member limit. Upgrade your
                    subscription to add more team members.
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant="outline"
                      className="text-red-600 dark:text-red-400 dark:border-red-400"
                    >
                      {usageData.currentUsers}/{usageData.maxUsers} Members
                    </Badge>
                  </div>
                  <Button
                    onClick={() =>
                      (window.location.href = "/dashboard/subscription")
                    }
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* General Error */}
          {generalError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {generalError}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <NameFields
              formData={formData}
              isLoading={isLoading || shouldDisableInputs}
              handleInputChange={handleInputChange}
              getFieldError={getFieldError}
            />

            <EmailField
              value={formData.email}
              error={getFieldError("email")}
              isLoading={isLoading || shouldDisableInputs}
              onChange={(value) => handleInputChange("email", value)}
            />

            {mode === "create" && (
              <PasswordField
                value={formData.password || ""}
                error={getFieldError("password")}
                isLoading={isLoading || shouldDisableInputs}
                onChange={(value) => handleInputChange("password", value)}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Country Select */}
              <div className="space-y-2">
                <Select
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  options={countryOptions}
                  placeholder={
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-gray-500 dark:text-gray-400">Select a country</span>
                    </div>
                  }
                  isDisabled={isLoading || shouldDisableInputs}
                  isClearable
                  styles={getCountrySelectStyles(!!getFieldError("country"))}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  components={{
                    Option: CustomOption,
                    SingleValue: CustomSingleValue,
                  }}
                  menuPlacement="top"
                />
                {getFieldError("country") && (
                  <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError("country")}
                  </p>
                )}
              </div>

              {/* Phone Input */}
              <PhoneInputField
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                defaultCountry={selectedCountry?.value as Country | undefined}
                isLoading={isLoading || shouldDisableInputs}
                error={getFieldError("phoneNumber")}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md !text-gray-700 dark:!text-white hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isLoading ||
                  !!(
                    mode === "create" &&
                    usageData &&
                    !usageData.canAddTeamMember
                  )
                }
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading
                  ? "Creating..."
                  : mode === "create"
                    ? "Create User"
                    : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

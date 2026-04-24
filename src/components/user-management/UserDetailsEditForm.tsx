// src/components/user-management/UserDetailsEditForm.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Save, X, AlertCircle, Globe, Calendar } from "lucide-react";
import { NameFields } from "./NameFields";
import { EmailField } from "./EmailField";
import { PhoneInputField } from "./PhoneInputField";
import {
  Select,
  countryOptions,
  SelectOption,
  CustomOption,
  CustomSingleValue,
} from "./CountrySelect";
import { getCountrySelectStyles } from "./CountrySelectStyles";
import { Country } from "react-phone-number-input";
import { UserFormEditData } from "@/schemas/UserFormSchema";

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
}

interface UserDetailsEditFormProps {
  user: User;
  formData: UserFormEditData;
  selectedCountry: SelectOption | null;
  isLoading: boolean;
  generalError: string | null;
  getFieldError: (field: string) => string;
  onInputChange: (
    field: keyof UserFormEditData,
    value: string | string[],
  ) => void;
  onCountryChange: (option: SelectOption | null) => void;
  onPhoneChange: (value?: string) => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export function UserDetailsEditForm({
  user,
  formData,
  selectedCountry,
  isLoading,
  generalError,
  getFieldError,
  onInputChange,
  onCountryChange,
  onPhoneChange,
  onCancel,
  onSave,
}: UserDetailsEditFormProps) {
  return (
    <>
      {/* General Error */}
      {generalError && (
        <div className="p-3 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-red-500 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">
              {generalError}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={onSave} className="mt-4 space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="pb-2 text-lg font-semibold text-gray-900! border-b dark:text-white!">
            Personal Information
          </h3>

          <NameFields
            formData={formData}
            isLoading={isLoading}
            handleInputChange={onInputChange}
            getFieldError={getFieldError}
          />

          <EmailField
            value={formData.email}
            error={getFieldError("email")}
            isLoading={isLoading}
            onChange={(value) => onInputChange("email", value)}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Country Select */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Country
              </label>
              <Select
                value={selectedCountry}
                onChange={onCountryChange}
                options={countryOptions}
                placeholder={
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-5 text-gray-400 dark:text-gray-500" />
                    <span className="text-gray-500 dark:text-gray-400">
                      Select a country
                    </span>
                  </div>
                }
                isDisabled={isLoading}
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
                <p className="flex items-center gap-1 mt-1 text-xs text-red-500 dark:text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {getFieldError("country")}
                </p>
              )}
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Phone Number
              </label>
              <PhoneInputField
                value={formData.phoneNumber}
                onChange={onPhoneChange}
                defaultCountry={selectedCountry?.value as Country | undefined}
                isLoading={isLoading}
                error={getFieldError("phoneNumber")}
              />
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="space-y-4">
          <h3 className="pb-2 text-lg font-semibold text-gray-900! border-b dark:text-white!">
            Account Information
          </h3>
          {/* Account information fields can be added here if needed */}
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-1 gap-4 pt-4 border-t md:grid-cols-2">
          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-blue-100 rounded-lg dark:bg-blue-900/30">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Member Since
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 mt-1 bg-yellow-100 rounded-lg dark:bg-yellow-900/30">
              <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last Login
              </p>
              <p className="text-base font-medium text-gray-900! dark:text-white!">
                {formatDate(user.lastLogin)}
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end pt-4 space-x-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="dark:text-white dark:border-gray-600"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </>
  );
}

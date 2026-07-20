// src/components/user-management/NameFields.tsx
"use client";

import { User, AlertCircle } from "lucide-react";

interface NameFieldsProps {
  formData: { firstName: string; lastName: string };
  isLoading: boolean;
  handleInputChange: (field: "firstName" | "lastName", value: string) => void;
  getFieldError: (field: string) => string;
}

export function NameFields({
  formData,
  isLoading,
  handleInputChange,
  getFieldError,
}: NameFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="relative flex items-center">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            className={`pl-10 h-10 w-full px-3 rounded-lg border text-sm ${
              getFieldError("firstName")
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:ring-(--brand-focus)"
            } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
            placeholder="First Name"
            disabled={isLoading}
          />
        </div>
        {getFieldError("firstName") && (
          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" />
            {getFieldError("firstName")}
          </p>
        )}
      </div>
      <div>
        <div className="relative flex items-center">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            className={`pl-10 h-10 w-full px-3 rounded-lg border text-sm ${
              getFieldError("lastName")
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:ring-(--brand-focus)"
            } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
            placeholder="Last Name"
            disabled={isLoading}
          />
        </div>
        {getFieldError("lastName") && (
          <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" />
            {getFieldError("lastName")}
          </p>
        )}
      </div>
    </div>
  );
}

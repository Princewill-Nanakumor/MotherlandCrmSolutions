// src/components/PhoneInputField.tsx
"use client";

import { Phone, AlertCircle } from "lucide-react";
import PhoneInput, { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value?: string) => void;
  defaultCountry?: Country;
  isLoading?: boolean;
  error?: string;
  placeholder?: string;
}

export const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  value,
  onChange,
  defaultCountry,
  isLoading = false,
  error,
  placeholder = "Enter phone number",
}) => {
  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          className={`
            phone-input-wrapper w-full px-3 py-2 rounded-lg border text-sm flex items-center
            ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
            ${error ? "error border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500" } bg-white dark:bg-gray-700 text-gray-900! dark:text-white! focus-within:outline-none focus-within:ring-2 focus-within:border-transparent`}
        >
          {/* Phone Icon */}
          <Phone className="w-4 h-4 mr-3 text-gray-400 dark:text-gray-500 shrink-0" />

          <PhoneInput
            international
            countryCallingCodeEditable={false}
            defaultCountry={defaultCountry}
            value={value}
            onChange={onChange}
            disabled={isLoading}
            placeholder={placeholder}
            className="w-full p-0 m-0 bg-transparent border-none"
          />
        </div>
        {error && (
          <p className="flex items-center gap-1 mt-1 text-xs text-red-500 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

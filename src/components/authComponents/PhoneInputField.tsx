// src/components/authComponents/PhoneInputField.tsx
"use client";

import React from "react";
import { Phone, AlertCircle } from "lucide-react";
import { SelectOption } from "./CountrySelectStyles";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  error?: string;
  placeholder?: string;
  selectedCountry?: SelectOption | null;
}

export function PhoneInputField({
  value,
  onChange,
  isLoading = false,
  error,
  placeholder = "Enter phone number",
  selectedCountry,
}: PhoneInputFieldProps) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let phoneValue = e.target.value;

    // Remove any non-digit characters except +, spaces, and parentheses
    phoneValue = phoneValue.replace(/[^\d\s\(\)\+\-]/g, "");

    // If a country is selected, always prepend the country code
    if (selectedCountry?.phoneCode) {
      phoneValue = selectedCountry.phoneCode + phoneValue;
    }

    // Always call onChange to trigger form validation
    onChange(phoneValue);
  };

  // Extract the phone number without country code for display
  const displayPhoneNumber =
    selectedCountry?.phoneCode && value.startsWith(selectedCountry.phoneCode)
      ? value.substring(selectedCountry.phoneCode.length)
      : value;

  return (
    <div>
      <div className="relative flex items-center">
        {/* Always show the phone icon */}
        <Phone className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none left-3 top-1/2 sm:h-5 sm:w-5" />

        {/* Show country code when country is selected */}
        {selectedCountry && (
          <div className="absolute flex items-center text-sm font-normal text-gray-900 -translate-y-1/2 left-10 sm:left-12 top-1/2 sm:text-base">
            <span>{selectedCountry.phoneCode}</span>
          </div>
        )}

        {/* Phone Input */}
        <input
          type="tel"
          value={displayPhoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={isLoading}
          className={`h-10 sm:h-12 w-full rounded-lg border text-sm sm:text-base ${
            selectedCountry ? "pl-20 sm:pl-22" : "pl-10 sm:pl-12"
          } ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-indigo-500" } placeholder-gray-500 text-gray-900! bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3 sm:h-4 sm:w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

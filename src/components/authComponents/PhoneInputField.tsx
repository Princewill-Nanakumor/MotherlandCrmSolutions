// src/components/authComponents/PhoneInputField.tsx
"use client";

import React from "react";
import { Phone, AlertCircle } from "lucide-react";
import { SelectOption } from "./CountrySelectStyles";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Forwarded to the underlying input (e.g. react-hook-form `field.onBlur`). */
  onBlur?: () => void;
  isLoading?: boolean;
  error?: string;
  placeholder?: string;
  selectedCountry?: SelectOption | null;
  /** Glass fields on signup/login hero */
  variant?: "default" | "darkHero";
}

export function PhoneInputField({
  value,
  onChange,
  onBlur,
  isLoading = false,
  error,
  placeholder = "Enter phone number",
  selectedCountry,
  variant = "default",
}: PhoneInputFieldProps) {
  const isHero = variant === "darkHero";
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let phoneValue = e.target.value;

    // Remove any non-digit characters except +, spaces, and parentheses
    phoneValue = phoneValue.replace(/[^\d\s\(\)\+\-]/g, "");

    // If a country is selected, always prepend the country code
    if (selectedCountry?.phoneCode) {
      phoneValue = selectedCountry.phoneCode + phoneValue;
    }

    onChange(phoneValue);
  };

  // Extract the phone number without country code for display
  const displayPhoneNumber =
    selectedCountry?.phoneCode && value.startsWith(selectedCountry.phoneCode)
      ? value.substring(selectedCountry.phoneCode.length)
      : value;

  return (
    <div>
      <div className="flex relative items-center">
        {/* Always show the phone icon */}
        <Phone
          className={`absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 sm:h-5 sm:w-5 ${isHero ? "text-white/50" : "text-gray-400"}`}
        />

        {/* Show country code when country is selected */}
        {selectedCountry && (
          <div
            data-auth-phone-prefix=""
            className={`pointer-events-none absolute flex items-center text-sm font-semibold -translate-y-1/2 left-10 sm:left-12 top-1/2 sm:text-base ${
              isHero ? "text-white!":"text-gray-900"}`}
          >
            <span
              className={isHero ? "text-white!":"text-gray-900"}
              style={isHero ? { color: "#ffffff" } : undefined}
            >
              {selectedCountry.phoneCode}
            </span>
          </div>
        )}

        {/* Phone Input */}
        <input
          type="tel"
          value={displayPhoneNumber}
          onChange={handlePhoneChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={isLoading}
          className={`h-10 sm:h-12 w-full rounded-md border text-sm sm:text-base focus:outline-none ${
            selectedCountry
              ? selectedCountry.phoneCode.length >= 4
                ? "pl-23 sm:pl-25"
                : "pl-21 sm:pl-24"
              : "pl-10 sm:pl-12"
          } ${
            isHero
              ? `font-semibold text-white! transition-[border-color,background-color,box-shadow] duration-200 ease-out focus-visible:outline-none placeholder:font-semibold placeholder:text-white/70 bg-white/10 ${
                  error ? "border-red-500" : "border-white"
                }`
              : `transition-colors ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-(--brand-focus)"} placeholder-gray-500 text-gray-900! bg-white focus:ring-2 focus:border-transparent`
          }`}
        />
      </div>

      {error && (
        <p className="flex gap-1 items-center mt-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3 sm:h-4 sm:w-4" />
          {error}
        </p>
      )}
    </div>
  );
}

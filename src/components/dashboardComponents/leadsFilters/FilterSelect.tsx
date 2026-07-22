// src/components/dashboardComponents/leadsFilters/FilterSelect.tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  disabled: boolean;
  isLoading?: boolean;
}

export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  isLoading = false,
}: FilterSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find((option) => option.value === value);
  const displayValue = currentOption?.label || placeholder;
  const isActiveFilter = value !== "all";

  // ✅ Show individual loading skeleton with same style
  if (isLoading) {
    return (
      <div className="h-10 bg-gray-200 rounded-md animate-pulse w-45 dark:bg-gray-700">
        <div className="sr-only">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-45 h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--brand-focus) focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between ${
          isActiveFilter
            ? "bg-white ring-2 border-(--brand-from) ring-(--brand-focus) dark:bg-gray-800"
            : "bg-white border-gray-300 dark:border-gray-600 dark:bg-gray-800"
        }`}
      >
        <span className="text-gray-900 dark:text-white">{displayValue}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="overflow-y-auto absolute right-0 left-0 top-full z-50 mt-1 max-h-60 bg-white rounded-md border border-gray-300 shadow-lg dark:bg-gray-800 dark:border-gray-600">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700 ${
                  value === option.value
                    ? "text-(--brand-from) font-medium"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        </>
      )}
    </div>
  );
};

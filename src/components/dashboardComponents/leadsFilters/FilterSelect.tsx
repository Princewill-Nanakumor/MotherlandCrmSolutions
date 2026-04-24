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
      <div className="w-[180px] h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse">
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
        className={`w-[180px] h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between ${
          isActiveFilter
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        }`}
      >
        <span className="text-gray-900 dark:text-white">
          {displayValue}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
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
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
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

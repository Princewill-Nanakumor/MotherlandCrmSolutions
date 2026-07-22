// src/components/dashboardComponents/leadsFilters/MultiSelectFilter.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  value: string[]; // Array of selected values
  onChange: (values: string[]) => void;
  options: Option[];
  placeholder: string;
  disabled: boolean;
  isLoading?: boolean;
  maxDisplayItems?: number; // Max items to show in button before showing count
  mode?: "include" | "exclude"; // Filter mode (for country filter)
  onModeChange?: () => void; // Mode toggle handler
}

export const MultiSelectFilter = ({
  value = [],
  onChange,
  options,
  placeholder,
  disabled,
  isLoading = false,
  maxDisplayItems = 2,
  mode,
  onModeChange,
}: MultiSelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle "All" option - clears all selections
  const handleAllToggle = (checked: boolean) => {
    if (checked) {
      onChange([]); // Empty array means "all"
    } else {
      onChange([]); // Keep empty for "all"
    }
  };

  // Handle individual option toggle
  const handleOptionToggle = (optionValue: string, checked: boolean) => {
    if (optionValue === "all") {
      handleAllToggle(checked);
      return;
    }

    // Prevent duplicate values
    const isAlreadySelected = value.includes(optionValue);

    if (checked && !isAlreadySelected) {
      // Add to selection
      onChange([...value, optionValue]);
    } else if (!checked && isAlreadySelected) {
      // Remove from selection
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  // Check if option is selected
  const isSelected = (optionValue: string) => {
    if (optionValue === "all") {
      return value.length === 0; // "All" is selected when no specific items are selected
    }
    return value.includes(optionValue);
  };

  // Get display text for button (with exclusion mode support)
  const getDisplayText = () => {
    if (value.length === 0) {
      return placeholder;
    }

    if (value.length === 1) {
      const selectedOption = options.find((opt) => opt.value === value[0]);
      return selectedOption?.label || placeholder;
    }

    // Show first N items + count
    const selectedOptions = value
      .slice(0, maxDisplayItems)
      .map((val) => options.find((opt) => opt.value === val)?.label)
      .filter(Boolean)
      .join(", ");

    const remaining = value.length - maxDisplayItems;
    if (remaining > 0) {
      return `${selectedOptions} +${remaining} more`;
    }

    return selectedOptions;
  };

  // Clear all selections
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const isActiveFilter = value.length > 0;
  const allSelected = value.length === 0;

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="h-10 bg-gray-200 rounded-md animate-pulse w-45 dark:bg-gray-700">
        <div className="sr-only">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-45 min-h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-(--brand-focus) focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between gap-2 ${
          isActiveFilter
            ? "bg-white ring-2 border-(--brand-from) ring-(--brand-focus) dark:bg-gray-800"
            : "bg-white border-gray-300 dark:border-gray-600 dark:bg-gray-800"
        }`}
      >
        <span className="flex-1 text-left text-gray-900 truncate dark:text-white">
          {getDisplayText()}
        </span>
        <div className="flex gap-1 items-center shrink-0">
          {isActiveFilter && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClearAll(e as unknown as React.MouseEvent);
                }
              }}
              className="p-0.5 rounded transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-(--brand-focus) hover:bg-[color-mix(in_srgb,var(--brand-from)_18%,transparent)]"
              aria-label="Clear selection"
            >
              <X className="h-3 w-3 text-(--brand-from)" />
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="overflow-y-auto absolute left-0 top-full z-50 mt-1 max-h-60 bg-white rounded-md border border-gray-300 shadow-lg dark:bg-gray-800 dark:border-gray-600 min-w-50 max-w-75">
          {/* Mode Toggle Button (only show if mode and onModeChange are provided) */}
          {mode !== undefined && onModeChange && (
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onModeChange();
                }}
                className={`flex items-center justify-center w-full px-2 py-1.5 rounded transition-colors ${
                  mode === "exclude"
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                title={
                  mode === "include"
                    ? "Switch to hide mode (currently showing selected)"
                    : "Switch to show mode (currently hiding selected)"
                }
              >
                {mode === "include" ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                )}
              </button>
            </div>
          )}

          {/* Select All / Clear All option */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -mx-3 px-3 py-1.5 rounded">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleAllToggle}
                aria-label="Select all"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {placeholder.includes("Exclude")
                  ? "Show All Countries"
                  : `All ${placeholder.replace("All ", "")}`}
              </span>
            </label>
          </div>

          {/* Individual options */}
          <div className="py-1">
            {options
              .filter((opt) => opt.value !== "all") // Exclude "all" from list since we have it at top
              .map((option) => {
                const checked = isSelected(option.value);
                return (
                  <div
                    key={option.value}
                    className="flex gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus-within:bg-gray-100 dark:focus-within:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Only toggle if click is not on the checkbox itself
                      const target = e.target as HTMLElement;
                      if (!target.closest('[data-slot="checkbox"]')) {
                        handleOptionToggle(option.value, !checked);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOptionToggle(option.value, !checked);
                      }
                    }}
                    role="checkbox"
                    tabIndex={0}
                    aria-checked={checked}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(checkedValue) => {
                        // This will be called when checkbox is clicked directly
                        handleOptionToggle(option.value, checkedValue === true);
                      }}
                      onClick={(e) => {
                        // Stop propagation to prevent double-triggering from parent div
                        e.stopPropagation();
                      }}
                      aria-label={option.label}
                    />
                    <span
                      className={`text-sm flex-1 ${
                        checked
                          ? "font-medium text-(--brand-from)"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {option.label}
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Selected count footer */}
          {isActiveFilter && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {value.length} {value.length === 1 ? "item" : "items"} selected
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

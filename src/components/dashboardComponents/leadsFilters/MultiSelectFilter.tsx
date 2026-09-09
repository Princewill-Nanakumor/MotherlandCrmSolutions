// src/components/dashboardComponents/leadsFilters/MultiSelectFilter.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FilterScrollHint,
  FILTER_LIST_MAX_HEIGHT_CLASS,
  useFilterListScrollHint,
} from "./FilterScrollHint";

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
  /** Singular/plural noun for selection counts, e.g. user/users, status/statuses */
  itemNoun?: { singular: string; plural: string };
}

function formatItemCount(
  count: number,
  itemNoun?: { singular: string; plural: string },
) {
  if (!itemNoun) {
    return `${count} ${count === 1 ? "item" : "items"}`;
  }
  return `${count} ${count === 1 ? itemNoun.singular : itemNoun.plural}`;
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
  itemNoun,
}: MultiSelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const listOptions = useMemo(
    () => options.filter((opt) => opt.value !== "all"),
    [options],
  );

  const { showHint, atBottom, scrollList } = useFilterListScrollHint(
    listRef,
    listOptions.length,
    isOpen && !disabled,
  );

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

  // Get display text for the closed select (option labels, not count)
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
      <div className="h-10 w-full bg-gray-200 rounded-md animate-pulse sm:w-45 dark:bg-gray-700">
        <div className="sr-only">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-w-0 sm:w-45" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-10 px-3 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-(--brand-focus)! disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between gap-2 transition-[border-color,background-color] cursor-pointer ${
          isActiveFilter || isOpen
            ? "bg-white dark:bg-gray-800 border-(--brand-from)!"
            : "bg-white border-gray-300 dark:border-gray-600 dark:bg-gray-800 hover:border-gray-400 hover:bg-gray-50 dark:hover:border-gray-500 dark:hover:bg-white/4"
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
              className="p-0.5 rounded transition-colors cursor-pointer focus:outline-none focus:ring-0 focus:border-(--brand-focus) hover:bg-[color-mix(in_srgb,var(--brand-from)_18%,transparent)]"
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
        <div className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-96 flex-col overflow-hidden bg-white rounded-md border border-gray-300 shadow-lg dark:bg-gray-800 dark:border-gray-600 sm:right-auto sm:min-w-50 sm:max-w-75">
          {/* Mode Toggle Button (only show if mode and onModeChange are provided) */}
          {mode !== undefined && onModeChange && (
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onModeChange();
                }}
                className={`flex w-full cursor-pointer items-center justify-center rounded px-2 py-1.5 transition-colors ${
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
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 -mx-3 px-3 py-1.5 rounded">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleAllToggle}
                aria-label="Select all"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {`All ${placeholder.replace(/^All\s+/i, "")}`}
              </span>
            </label>
          </div>

          {/* Fixed-height list (~4 rows) so the selected footer cannot compress it */}
          <div className="flex flex-col overflow-hidden shrink-0">
            <div
              ref={listRef}
              className={`overflow-y-auto py-1 brand-scrollbar ${FILTER_LIST_MAX_HEIGHT_CLASS}`}
            >
              {listOptions.map((option) => {
                const checked = isSelected(option.value);
                return (
                  <div
                    key={option.value}
                    className="flex gap-2 items-center px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onMouseDown={(e) => {
                      // Keep hover stable: avoid focus flash on click.
                      if (
                        !(e.target as HTMLElement).closest(
                          '[data-slot="checkbox"]',
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
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
            <FilterScrollHint
              show={showHint}
              atBottom={atBottom}
              onScrollClick={scrollList}
            />
          </div>

          {/* Selected count footer — same as GitHub: only when something is selected */}
          {isActiveFilter && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatItemCount(value.length, itemNoun)} selected
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

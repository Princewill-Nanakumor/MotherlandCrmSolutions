// src/components/dashboardComponents/DashboardSearchBar.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Search, X } from "lucide-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface DashboardSearchBarProps {
  onSearch: (query: string) => void;
  searchQuery?: string;
  isLoading?: boolean;
  placeholder?: string;
}

export function DashboardSearchBar({
  onSearch,
  searchQuery = "",
  isLoading = false,
  placeholder = "Search...",
}: DashboardSearchBarProps) {
  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedValue = useDebounce(inputValue, 300);
  const isFirstRunRef = useRef(true);
  const skipNextDebounceRef = useRef(false);
  const isUserTypingRef = useRef(false);

  // Sync from context/URL only when searchQuery changes from outside (e.g. init from URL, clear), not while user is typing
  useEffect(() => {
    if (isUserTypingRef.current) return;
    setInputValue(searchQuery);
  }, [searchQuery]);

  // Trigger search when debounced value changes (skip first run to avoid clearing context on mount)
  useEffect(() => {
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return;
    }
    isUserTypingRef.current = false; // done with this typing gesture
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserTypingRef.current = true;
    setInputValue(e.target.value);
  };

  const handleClear = useCallback(() => {
    isUserTypingRef.current = false;
    setInputValue("");
    onSearch("");
    skipNextDebounceRef.current = true; // Skip debounce effect when it catches up - avoid redundant onSearch
  }, [onSearch]);

  return (
    <div className="relative w-full max-w-md" role="search">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search
          className="h-5 w-5 text-gray-600! dark:text-gray-400!"
          aria-hidden="true"
        />
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className="block w-full pl-10 pr-10 py-2 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-purple-200 dark:border-gray-600 text-gray-900! dark:text-gray-100! placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-(--brand-focus) focus:border-transparent"
        placeholder={placeholder}
        disabled={isLoading}
        aria-label="Search leads by name, email, or phone"
      />

      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          aria-label="Clear search"
        >
          <X className="h-5 w-5 text-gray-400! hover:text-gray-600! dark:hover:text-gray-300!" />
        </button>
      )}
    </div>
  );
}

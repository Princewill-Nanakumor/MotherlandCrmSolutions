// src/components/dashboardComponents/leadsFilters/CountryFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface CountryFilterProps {
  value: string[]; // Changed to array
  onChange: (values: string[]) => void; // Changed to array
  disabled: boolean;
  isLoading?: boolean;
  mode?: "include" | "exclude"; // Filter mode
  onModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
  availableCountries?: string[]; // Optional: if provided, use these instead of fetching
}

export const CountryFilter = ({
  value = [],
  onChange,
  disabled,
  isLoading = false,
  mode: externalMode,
  onModeChange,
  availableCountries: providedCountries,
}: CountryFilterProps) => {
  // Internal mode state if not controlled externally
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("countryFilterMode");
        return (stored === "exclude" ? "exclude" : "include") as
          | "include"
          | "exclude";
      }
      return "include";
    }
  );

  const mode = externalMode ?? internalMode;

  // Save mode to localStorage when it changes and dispatch custom event
  useEffect(() => {
    if (typeof window !== "undefined" && !externalMode) {
      localStorage.setItem("countryFilterMode", mode);
      // Dispatch custom event for immediate sync (same-tab)
      window.dispatchEvent(new CustomEvent("countryFilterModeChanged"));
    }
  }, [mode, externalMode]);

  const handleModeToggle = () => {
    const newMode = mode === "include" ? "exclude" : "include";
    if (onModeChange) {
      onModeChange(newMode);
    } else {
      setInternalMode(newMode);
    }
  };

  // If availableCountries are provided, use them directly (for user leads page)
  // Otherwise, fetch distinct countries from API (for admin all-leads page)
  const { data: fetchedCountries = [] } = useQuery<string[]>({
    queryKey: ["leads", "countries"],
    queryFn: async () => {
      const response = await fetch("/api/leads/countries", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch countries");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    enabled: !providedCountries,
  });

  const countries = useMemo(() => {
    if (providedCountries && providedCountries.length > 0) {
      return providedCountries.sort((a, b) => a.localeCompare(b));
    }
    return fetchedCountries
      .filter((c): c is string => Boolean(c))
      .sort((a, b) => a.localeCompare(b));
  }, [providedCountries, fetchedCountries]);

  const options = useMemo(
    () =>
      countries.map((country: string) => ({
        value: country,
        label: country,
      })),
    [countries]
  );

  const getPlaceholder = () => {
    if (value.length === 0) {
      return "All Countries";
    }
    if (mode === "exclude") {
      return `Hide ${value.length} ${value.length === 1 ? "country" : "countries"}`;
    }
    return `Show ${value.length} ${value.length === 1 ? "country" : "countries"}`;
  };

  return (
    <MultiSelectFilter
      value={value}
      onChange={onChange}
      options={options}
      placeholder={getPlaceholder()}
      disabled={disabled}
      isLoading={isLoading}
      mode={mode}
      onModeChange={handleModeToggle}
    />
  );
};

// src/components/dashboardComponents/leadsFilters/CountryFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { LEAD_COUNTRIES_QUERY_KEY } from "@/lib/leadFilterQueries";
import { normalizeCountryInput } from "@/lib/countryNormalize";

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
  const { data: fetchedCountries = [], isLoading: isLoadingCountries } =
    useQuery<string[]>({
    queryKey: [...LEAD_COUNTRIES_QUERY_KEY],
    queryFn: async () => {
      const response = await fetch("/api/leads/countries", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch countries");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    enabled: !providedCountries,
  });

  const countries = useMemo(() => {
    const byKey = new Map<string, string>();
    const add = (raw: string) => {
      const t = String(raw).trim();
      if (!t) return;
      const canonical = normalizeCountryInput(t);
      const key = canonical.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, canonical);
    };

    if (providedCountries && providedCountries.length > 0) {
      providedCountries.forEach(add);
    } else {
      fetchedCountries.forEach(add);
    }
    value.forEach(add);

    return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b));
  }, [providedCountries, fetchedCountries, value]);

  const options = useMemo(
    () =>
      countries.map((country: string) => ({
        value: country,
        label: country,
      })),
    [countries]
  );

  const countriesLoading = !providedCountries && isLoadingCountries;

  return (
    <MultiSelectFilter
      value={value}
      onChange={onChange}
      options={options}
      placeholder="All Countries"
      disabled={disabled || countriesLoading}
      isLoading={isLoading || countriesLoading}
      mode={mode}
      onModeChange={handleModeToggle}
      itemNoun={{ singular: "country", plural: "countries" }}
    />
  );
};

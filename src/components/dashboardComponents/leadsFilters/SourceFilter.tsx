// src/components/dashboardComponents/filters/SourceFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@/types/leads";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { getAvailableSources } from "@/utils/LeadsUtils";

interface SourceFilterProps {
  value: string[]; // Changed to array
  onChange: (values: string[]) => void; // Changed to array
  disabled: boolean;
  isLoading?: boolean;
  mode?: "include" | "exclude"; // Filter mode
  onModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
  availableSources?: string[]; // Optional: if provided, use these instead of fetching
}

export const SourceFilter = ({
  value = [],
  onChange,
  disabled,
  isLoading = false,
  mode: externalMode,
  onModeChange,
  availableSources: providedSources,
}: SourceFilterProps) => {
  // Internal mode state if not controlled externally
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sourceFilterMode");
      return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
    }
    return "include";
  });

  const mode = externalMode ?? internalMode;

  // Save mode to localStorage when it changes and dispatch custom event
  useEffect(() => {
    if (typeof window !== "undefined" && !externalMode) {
      localStorage.setItem("sourceFilterMode", mode);
      // Dispatch custom event for immediate sync (same-tab)
      window.dispatchEvent(new CustomEvent("sourceFilterModeChanged"));
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
  // If availableSources are provided, use them directly (for user leads page)
  // Otherwise, fetch from API (for admin all-leads page)
  const { data: leads = [], isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads/all", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 2 * 60 * 1000, // Match useLeadsPage - 2 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    placeholderData: (previousData) => previousData, // Preserve previous data during refetch
    enabled: !providedSources, // Only fetch if sources are not provided
  });

  // If sources are provided, use them directly
  // Otherwise, extract unique sources from fetched leads using utility function
  const sources = useMemo(() => {
    // If sources are provided, use them directly (already sorted from getAvailableSources)
    if (providedSources && providedSources.length > 0) {
      return providedSources;
    }
    
    // Otherwise, extract from fetched leads (already sorted from getAvailableSources)
    return getAvailableSources(leads);
  }, [leads, providedSources]);

  const options = useMemo(
    () =>
      sources
        .map((source: string) => ({
          value: source,
          label: source.charAt(0).toUpperCase() + source.slice(1).toLowerCase(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [sources]
  );

  const getPlaceholder = () => {
    if (value.length === 0) {
      return "All Sources";
    }
    if (mode === "exclude") {
      return `Hide ${value.length} ${value.length === 1 ? "source" : "sources"}`;
    }
    return `Show ${value.length} ${value.length === 1 ? "source" : "sources"}`;
  };

  return (
    <MultiSelectFilter
      value={value}
      onChange={onChange}
      options={options}
      placeholder={getPlaceholder()}
      disabled={disabled || isLoadingLeads}
      isLoading={isLoading || isLoadingLeads}
      mode={mode}
      onModeChange={handleModeToggle}
    />
  );
};

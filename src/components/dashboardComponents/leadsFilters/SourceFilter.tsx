// src/components/dashboardComponents/filters/SourceFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { MultiSelectFilter } from "./MultiSelectFilter";

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
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sourceFilterMode");
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
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  // If availableSources are provided, use them (e.g. user leads page).
  // Otherwise fetch distinct sources from API so we get all sources, not just from first page.
  const { data: fetchedSources = [], isLoading: isLoadingSources } = useQuery<
    string[]
  >({
    queryKey: ["leads", "sources"],
    queryFn: async () => {
      const response = await fetch("/api/leads/sources", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch sources");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    enabled: !providedSources && isAuthenticated,
  });

  const sources = useMemo(() => {
    if (providedSources && providedSources.length > 0) return providedSources;
    return fetchedSources
      .filter((s): s is string => Boolean(s))
      .sort((a, b) => a.localeCompare(b));
  }, [providedSources, fetchedSources]);

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
      disabled={disabled || isLoadingSources}
      isLoading={isLoading || isLoadingSources}
      mode={mode}
      onModeChange={handleModeToggle}
    />
  );
};

// src/components/dashboardComponents/leadsFilters/SourceFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { MultiSelectFilter } from "./MultiSelectFilter";
import {
  LEAD_SOURCES_QUERY_KEY,
} from "@/lib/leadFilterQueries";

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
    queryKey: [...LEAD_SOURCES_QUERY_KEY],
    queryFn: async () => {
      const response = await fetch("/api/leads/sources", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch sources");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    enabled: !providedSources && isAuthenticated,
  });

  const sources = useMemo(() => {
    const raw =
      providedSources && providedSources.length > 0
        ? providedSources
        : fetchedSources.filter((s): s is string => Boolean(s));
    // Deduplicate by normalized name (trim + lowercase) so "Richer" and "richer" show once
    const byKey = new Map<string, string>();
    for (const s of raw) {
      const t = String(s).trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, t);
    }
    for (const selected of value) {
      const t = String(selected).trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, t);
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [providedSources, fetchedSources, value]);

  const options = useMemo(
    () =>
      sources
        .map((source: string) => ({
          value: source,
          label: source,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [sources]
  );

  return (
    <MultiSelectFilter
      value={value}
      onChange={onChange}
      options={options}
      placeholder="All Sources"
      disabled={disabled || isLoadingSources}
      isLoading={isLoading || isLoadingSources}
      mode={mode}
      onModeChange={handleModeToggle}
      itemNoun={{ singular: "source", plural: "sources" }}
    />
  );
};

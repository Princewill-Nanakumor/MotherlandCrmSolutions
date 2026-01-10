// src/components/dashboardComponents/filters/StatusFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface StatusFilterProps {
  value: string[]; // Changed to array
  onChange: (values: string[]) => void; // Changed to array
  disabled: boolean;
  isLoading?: boolean;
  mode?: "include" | "exclude"; // Filter mode
  onModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
}

export const StatusFilter = ({
  value = [],
  onChange,
  disabled,
  isLoading = false,
  mode: externalMode,
  onModeChange,
}: StatusFilterProps) => {
  // Internal mode state if not controlled externally
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("statusFilterMode");
      return (stored === "exclude" ? "exclude" : "include") as "include" | "exclude";
    }
    return "include";
  });

  const mode = externalMode ?? internalMode;

  // Save mode to localStorage when it changes and dispatch custom event
  useEffect(() => {
    if (typeof window !== "undefined" && !externalMode) {
      localStorage.setItem("statusFilterMode", mode);
      // Dispatch custom event for immediate sync (same-tab)
      window.dispatchEvent(new CustomEvent("statusFilterModeChanged"));
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
  // ✅ FIX: Use useQuery to subscribe to cache updates
  const { data: statuses = [] } = useQuery<
    Array<{ id: string; _id?: string; name: string; color?: string }>
  >({
    queryKey: ["statuses"],
    queryFn: async () => {
      const response = await fetch("/api/statuses", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch statuses");
      const data = await response.json();

      // Ensure "NEW" status is always included (for imported leads)
      // Check if "NEW" exists by name (case-insensitive) or by _id/id
      const hasNewStatus = data.some(
        (status: { id?: string; _id?: string; name?: string }) =>
          status._id === "NEW" ||
          status.id === "NEW" ||
          status.name?.toUpperCase() === "NEW"
      );

      if (!hasNewStatus) {
        // Add "NEW" status at the beginning
        data.unshift({
          _id: "NEW",
          id: "NEW",
          name: "New",
          color: "#3B82F6",
        });
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const options = useMemo(() => {
    return statuses
      .map((status) => ({
        value: status.id || status._id || "",
        label:
          status.name.charAt(0).toUpperCase() +
          status.name.slice(1).toLowerCase(),
      }))
      .filter((opt) => opt.value) // Filter out any invalid options
      .sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
  }, [statuses]);

  const getPlaceholder = () => {
    if (value.length === 0) {
      return "All Statuses";
    }
    if (mode === "exclude") {
      return `Hide ${value.length} ${value.length === 1 ? "status" : "statuses"}`;
    }
    return `Show ${value.length} ${value.length === 1 ? "status" : "statuses"}`;
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

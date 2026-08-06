// src/components/dashboardComponents/leadsFilters/StatusFilter.tsx
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
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("statusFilterMode");
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

  // All status definitions (from settings)
  const { data: statuses = [] } = useQuery<
    Array<{ id: string; _id?: string; name: string; color?: string }>
  >({
    queryKey: ["statuses"],
    queryFn: async () => {
      const response = await fetch("/api/statuses", {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch statuses");
      const data = await response.json();

      const hasNewStatus = data.some(
        (s: { id?: string; _id?: string; name?: string }) =>
          s._id === "NEW" || s.id === "NEW" || s.name?.toUpperCase() === "NEW"
      );
      if (!hasNewStatus) {
        data.unshift({
          _id: "NEW",
          id: "NEW",
          name: "New",
          color: "#3B82F6",
        });
      }
      return data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
  });

  // Show all statuses from /api/statuses (even if no current leads have them)
  const options = useMemo(() => {
    return statuses
      .map((status) => {
        const id = status.id || status._id || "";
        const name = status.name ?? "";
        return {
          value: id,
          label: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
        };
      })
      .filter((opt): opt is { value: string; label: string } =>
        Boolean(opt && opt.value)
      )
      .sort((a, b) => a.label.localeCompare(b.label));
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

"use client";

import { useMemo, useState, useEffect } from "react";
import { useStatuses } from "@/context/StatusContext";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface StatusFilterProps {
  value: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
  isLoading?: boolean;
  mode?: "include" | "exclude";
  onModeChange?: (mode: "include" | "exclude") => void;
}

export const StatusFilter = ({
  value = [],
  onChange,
  disabled,
  isLoading = false,
  mode: externalMode,
  onModeChange,
}: StatusFilterProps) => {
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("statusFilterMode");
        return (stored === "exclude" ? "exclude" : "include") as
          | "include"
          | "exclude";
      }
      return "include";
    },
  );

  const mode = externalMode ?? internalMode;
  const { statuses, isLoading: isLoadingStatuses } = useStatuses();

  useEffect(() => {
    if (typeof window !== "undefined" && !externalMode) {
      localStorage.setItem("statusFilterMode", mode);
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
        Boolean(opt && opt.value),
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

  const filterLoading = isLoading || isLoadingStatuses;

  return (
    <MultiSelectFilter
      value={value}
      onChange={onChange}
      options={options}
      placeholder={getPlaceholder()}
      disabled={disabled || filterLoading}
      isLoading={filterLoading}
      mode={mode}
      onModeChange={handleModeToggle}
    />
  );
};

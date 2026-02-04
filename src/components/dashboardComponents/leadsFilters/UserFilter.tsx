// src/components/dashboardComponents/filters/UserFilter.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/user.types";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface UserFilterProps {
  value: string[]; // Changed to array
  onChange: (values: string[]) => void; // Changed to array
  disabled: boolean;
  isLoading?: boolean;
  mode?: "include" | "exclude"; // Filter mode
  onModeChange?: (mode: "include" | "exclude") => void; // Mode change handler
}

export const UserFilter = ({
  value = [],
  onChange,
  disabled,
  isLoading = false,
  mode: externalMode,
  onModeChange,
}: UserFilterProps) => {
  // Internal mode state if not controlled externally
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("userFilterMode");
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
      localStorage.setItem("userFilterMode", mode);
      // Dispatch custom event for immediate sync (same-tab)
      window.dispatchEvent(new CustomEvent("userFilterModeChanged"));
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

  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = session?.user?.id;
  const isAuthenticated = sessionStatus === "authenticated";

  // Only fetch users when authenticated so dev doesn't get 401 and empty list
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      return Array.isArray(data) ? data : (data?.users ?? []);
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    enabled: isAuthenticated,
  });

  const options = useMemo(() => {
    const dropdownUsers = users.filter((user) => user.status === "ACTIVE");

    // Don't show current admin in the filter list (all-leads is admin-only)
    const filteredUsers = currentUserId
      ? dropdownUsers.filter((user) => user.id !== currentUserId)
      : dropdownUsers;

    const userOptions = filteredUsers
      .map((user) => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "unassigned", label: "Unassigned Leads" }, ...userOptions];
  }, [users, currentUserId]);

  const getPlaceholder = () => {
    if (value.length === 0) {
      return "All Leads";
    }
    if (mode === "exclude") {
      return `Hide ${value.length} ${value.length === 1 ? "user" : "users"}`;
    }
    return `Show ${value.length} ${value.length === 1 ? "user" : "users"}`;
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

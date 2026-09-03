"use client";

import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/user.types";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface UserFilterProps {
  value: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
  isLoading?: boolean;
  mode?: "include" | "exclude";
  onModeChange?: (mode: "include" | "exclude") => void;
  /** When provided, skip the internal /api/users fetch (All Leads page). */
  users?: User[];
}

export const UserFilter = ({
  value = [],
  onChange,
  disabled,
  isLoading = false,
  mode: externalMode,
  onModeChange,
  users: providedUsers,
}: UserFilterProps) => {
  const [internalMode, setInternalMode] = useState<"include" | "exclude">(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("userFilterMode");
        return (stored === "exclude" ? "exclude" : "include") as
          | "include"
          | "exclude";
      }
      return "include";
    },
  );

  const mode = externalMode ?? internalMode;

  useEffect(() => {
    if (typeof window !== "undefined" && !externalMode) {
      localStorage.setItem("userFilterMode", mode);
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
  const useProvidedUsers = providedUsers !== undefined;

  const { data: fetchedUsers = [], isLoading: isFetchingUsers } = useQuery<
    User[]
  >({
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
    enabled: isAuthenticated && !useProvidedUsers,
  });

  const users = useProvidedUsers ? providedUsers : fetchedUsers;
  const usersLoading = useProvidedUsers ? isLoading : isFetchingUsers;

  const options = useMemo(() => {
    const dropdownUsers = users.filter((user) => user.status === "ACTIVE");

    const isOwner = session?.user?.role === "ADMIN";
    const filteredUsers =
      isOwner && currentUserId
        ? dropdownUsers.filter((user) => user.id !== currentUserId)
        : dropdownUsers;

    const userOptions = filteredUsers
      .map((user) => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "unassigned", label: "Unassigned Leads" }, ...userOptions];
  }, [users, currentUserId, session?.user?.role]);

  return (
    <MultiSelectFilter
      value={value}
      onChange={onChange}
      options={options}
      placeholder="All Leads"
      disabled={disabled || usersLoading}
      isLoading={usersLoading}
      mode={mode}
      onModeChange={handleModeToggle}
      itemNoun={{ singular: "user", plural: "users" }}
    />
  );
};

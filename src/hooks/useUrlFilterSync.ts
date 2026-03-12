// src/hooks/useUrlFilterSync.ts
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { User } from "@/types/user.types";

// Constants
const FILTER_VALUES = {
  ALL: "all",
  UNASSIGNED: "unassigned",
} as const;

type FilterValue = (typeof FILTER_VALUES)[keyof typeof FILTER_VALUES] | string;

export const useUrlFilterSync = (
  users: User[],
  isLoadingUsers: boolean,
  filterByUser: string,
  setFilterByUser: (value: string) => void
) => {
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to convert user name to ID
  const getUserNameToId = useCallback(
    (userName: string): string | null => {
      console.log("=== getUserNameToId ===");
      console.log("Input userName:", userName);
      console.log(
        "Available users:",
        users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))
      );

      if (!userName) {
        console.log("userName is empty, returning null");
        return null;
      }

      // Normalize the input
      const normalizedInput = decodeURIComponent(userName)
        .toLowerCase()
        .replace(/-/g, " ")
        .trim();

      console.log("Normalized input:", normalizedInput);

      const user = users.find((user) => {
        const fullName = `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .trim();
        const urlName = `${user.firstName}-${user.lastName}`
          .toLowerCase()
          .replace(/\s+/g, "-");

        const matches =
          fullName === normalizedInput ||
          urlName === normalizedInput ||
          user.id === userName;
        console.log(
          `Checking user ${user.id}: fullName="${fullName}", urlName="${urlName}", matches=${matches}`
        );

        return matches;
      });

      if (user) {
        console.log("Found user:", user.id);
        return user.id;
      }

      console.log("No user found, returning null");
      return null;
    },
    [users]
  );

  // Helper function to convert user ID to name
  const getUserIdToName = useCallback(
    (userId: string): string | null => {
      console.log("=== getUserIdToName ===");
      console.log("Input userId:", userId);

      const user = users.find((user) => user.id === userId);
      if (user) {
        const userName = `${user.firstName}-${user.lastName}`.replace(
          /\s+/g,
          "-"
        );
        console.log("Found user, returning:", userName);
        return userName;
      }

      console.log("No user found, returning null");
      return null;
    },
    [users]
  );

  // Handle URL parameters for filtering
  useEffect(() => {
    console.log("=== URL FILTER SYNC EFFECT ===");
    console.log("isLoadingUsers:", isLoadingUsers);
    console.log("users.length:", users.length);
    console.log("current filterByUser:", filterByUser);

    if (isLoadingUsers || users.length === 0) {
      console.log("Waiting for users to load...");
      return;
    }

    const urlFilter = searchParams.get("filter");
    console.log("URL filter:", urlFilter);
    console.log(
      "Available users:",
      users.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))
    );

    let newFilterValue: FilterValue = FILTER_VALUES.ALL;

    if (urlFilter) {
      if (urlFilter === FILTER_VALUES.UNASSIGNED) {
        newFilterValue = FILTER_VALUES.UNASSIGNED;
        console.log("URL filter is 'unassigned'");
      } else {
        const userId = getUserNameToId(urlFilter);
        newFilterValue = userId || FILTER_VALUES.ALL;
        console.log("Converted URL filter:", {
          from: urlFilter,
          to: newFilterValue,
          success: !!userId,
        });
      }
    }

    // Only update if the value has changed
    if (newFilterValue !== filterByUser) {
      console.log("Updating filter from URL:", {
        from: filterByUser,
        to: newFilterValue,
      });
      setFilterByUser(newFilterValue);
    }

    if (!isInitialized) {
      setIsInitialized(true);
      console.log("Filter initialized with:", newFilterValue);
    }
  }, [
    searchParams,
    users,
    isLoadingUsers,
    filterByUser,
    setFilterByUser,
    isInitialized,
    getUserNameToId,
  ]);

  const handleFilterChange = useCallback(
    (newFilter: string) => {
      console.log("=== HANDLE FILTER CHANGE ===");
      console.log("New filter value:", newFilter);

      // Update local state immediately
      setFilterByUser(newFilter);

      // Prepare new URL
      const params = new URLSearchParams(searchParams);

      if (newFilter === FILTER_VALUES.ALL) {
        params.delete("filter");
        console.log("Removing filter from URL");
      } else if (newFilter === FILTER_VALUES.UNASSIGNED) {
        params.set("filter", FILTER_VALUES.UNASSIGNED);
        console.log("Setting URL filter to 'unassigned'");
      } else {
        const userName = getUserIdToName(newFilter);
        if (userName) {
          params.set("filter", userName);
          console.log("Setting URL filter to user name:", userName);
        } else {
          console.warn("Could not convert user ID to name:", newFilter);
          params.delete("filter");
        }
      }

      // Preserve the current page parameter
      const currentPage = searchParams.get("page");
      if (currentPage) {
        params.set("page", currentPage);
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      console.log("Updating URL to:", newUrl);

      // Update URL without scrolling
      router.push(newUrl, { scroll: false });
    },
    [setFilterByUser, searchParams, router, getUserIdToName]
  );

  return {
    isInitialized,
    handleFilterChange,
    FILTER_VALUES,
  };
};

// Default export
export default useUrlFilterSync;

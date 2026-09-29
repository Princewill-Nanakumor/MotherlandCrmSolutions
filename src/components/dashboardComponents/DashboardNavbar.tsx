// src/components/dashboardComponents/DashboardNavbar.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  LayoutDashboard,
  Filter,
} from "lucide-react";
import { DashboardSearchBar } from "./DashboardSearchBar";
import ThemeToggle from "./ThemeToggle";
import { DateTimeDisplay } from "./DateTimeDisplay";
import { UserDropdownMenu, UserDropdownMenuProps } from "./UserDropdownMenu";
import { NotificationBell } from "../notifications/NotificationBell";
import { useUserProfileData } from "@/hooks/useNavbarData";

interface DashboardNavbarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  isLoading?: boolean;
  // New props for toggle functionality
  showHeader?: boolean;
  showControls?: boolean;
  onToggleHeader?: () => void;
  onToggleControls?: () => void;
  // Only show these buttons on leads pages
  showLeadsToggles?: boolean;
  // Only show search bar on leads pages
  showSearch?: boolean;
}

const leadsToggleButtonClassName =
  "flex items-center justify-center rounded-md transition-colors border border-white/20 dark:border-gray-600/50 brand-navbar-text bg-white/20 hover:bg-white/30 dark:bg-white/10 dark:hover:bg-white/20 p-2 sm:gap-1 sm:px-3 sm:py-1.5 sm:text-xs sm:font-medium";

export default function DashboardNavbar({
  onSearch,
  searchQuery,
  isLoading = false,
  showHeader = true,
  showControls = true,
  onToggleHeader,
  onToggleControls,
  showLeadsToggles = false,
  showSearch = false,
}: DashboardNavbarProps) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use React Query for user profile data
  const { userProfile, isLoading: profileLoading } = useUserProfileData();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dropdown close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleSearch = useCallback(
    (query: string) => {
      onSearch(query);
    },
    [onSearch],
  );

  const leadsToggles = showLeadsToggles ? (
    <div className="flex items-center gap-1.5 shrink-0 sm:gap-2">
      <button
        type="button"
        onClick={onToggleHeader}
        className={leadsToggleButtonClassName}
        title={`${showHeader ? "Hide" : "Show"} Header`}
        aria-label={`${showHeader ? "Hide" : "Show"} header`}
        aria-pressed={showHeader}
      >
        <LayoutDashboard className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline-flex" aria-hidden="true">
          {showHeader ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleControls}
        className={leadsToggleButtonClassName}
        title={`${showControls ? "Hide" : "Show"} Controls`}
        aria-label={`${showControls ? "Hide" : "Show"} filters`}
        aria-pressed={showControls}
      >
        <Filter className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        <span className="hidden sm:inline-flex" aria-hidden="true">
          {showControls ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </span>
      </button>
    </div>
  ) : null;

  const rightControls = (
    <div className="flex items-center gap-2 shrink-0 sm:gap-4">
      <DateTimeDisplay />
      {session?.user?.id ? <NotificationBell /> : null}
      <ThemeToggle isLoading={isLoading} />
      <UserDropdownMenu
        session={session}
        userProfile={userProfile as UserDropdownMenuProps["userProfile"]}
        balanceLoading={profileLoading}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        dropdownRef={dropdownRef}
      />
    </div>
  );

  const searchField = showSearch ? (
    <DashboardSearchBar
      onSearch={handleSearch}
      searchQuery={searchQuery}
      isLoading={isLoading}
      placeholder="Search by name, email, or phone..."
      className="relative w-full max-w-none sm:max-w-md"
    />
  ) : null;

  if (!mounted) {
    // SSR fallback — match mobile two-row / desktop single-row shell
    return (
      <nav
        className={`brand-navbar gap-2 px-3 py-3 shadow-lg border-b border-transparent sm:px-6 ${
          showSearch
            ? "grid grid-cols-[auto_minmax(0,1fr)_auto] sm:flex sm:items-center sm:justify-between"
            : "flex items-center justify-between"
        }`}
      >
        <div className="col-start-1 row-start-1 w-16 shrink-0 sm:w-32" />
        {showSearch && (
          <div className="col-span-3 row-start-2 min-w-0 sm:row-start-auto sm:flex-1 sm:mx-4">
            <div className="relative w-full max-w-none sm:mx-auto sm:max-w-md">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-5 h-5 brand-icon opacity-70" />
              </div>
              <input
                type="text"
                className="block w-full h-10 pl-10 pr-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-transparent"
                disabled
              />
            </div>
          </div>
        )}
        {!showSearch && <div className="flex-1" />}
        <div className="col-start-3 row-start-1 flex items-center w-32 space-x-4 shrink-0 justify-end">
          <UserDropdownMenu
            session={session}
            userProfile={userProfile as UserDropdownMenuProps["userProfile"]}
            balanceLoading={profileLoading}
            dropdownOpen={dropdownOpen}
            setDropdownOpen={setDropdownOpen}
            dropdownRef={dropdownRef}
          />
        </div>
      </nav>
    );
  }

  // Leads pages: mobile = row1 toggles+actions, row2 full-width search.
  // Desktop (sm+): single row with search in the middle.
  if (showSearch) {
    return (
      <nav className="brand-navbar grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-2 gap-y-2 px-3 py-3 shadow-lg border-b border-transparent sm:flex sm:items-center sm:justify-between sm:gap-2 sm:px-6">
        <div className="col-start-1 row-start-1 flex items-center shrink-0">
          {leadsToggles}
        </div>

        <div className="col-span-3 row-start-2 min-w-0 sm:row-start-auto sm:flex sm:flex-1 sm:justify-center sm:mx-4">
          {searchField}
        </div>

        <div className="col-start-3 row-start-1 flex items-center justify-end">
          {rightControls}
        </div>
      </nav>
    );
  }

  return (
    <nav className="brand-navbar flex items-center justify-between gap-2 px-3 py-3 shadow-lg border-b border-transparent sm:px-6">
      <div className="flex items-center gap-2 shrink-0">{leadsToggles}</div>
      <div className="flex-1" />
      {rightControls}
    </nav>
  );
}

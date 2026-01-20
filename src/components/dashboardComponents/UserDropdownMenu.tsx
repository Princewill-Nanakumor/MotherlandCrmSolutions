// src/components/dashboardComponents/UserDropdownMenu.tsx
"use client";
import React from "react";
import { UserCircle, LogOut, User, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { BalanceDisplay } from "./BalanceDisplay";
import { PlanDisplay } from "./PlanDisplay";

export interface UserDropdownMenuProps {
  session: {
    user?: {
      firstName?: string;
      email?: string;
      lastName?: string;
      role?: string;
    };
  } | null;
  userProfile:
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
        balance?: number;
        role?: string;
        currentPlan?: string;
        subscriptionStatus?: "active" | "inactive" | "trial" | "expired";
        trialEndsAt?: string;
        subscriptionEndDate?: string;
      }
    | null
    | undefined; // Added undefined to handle React Query's undefined state
  balanceLoading: boolean;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

export function UserDropdownMenu({
  session,
  userProfile,
  balanceLoading,
  dropdownOpen,
  setDropdownOpen,
  dropdownRef,
}: UserDropdownMenuProps) {
  const router = useRouter();

  const isAdmin =
    session?.user?.role === "ADMIN" || userProfile?.role === "ADMIN";

  const handleProfile = () => {
    setDropdownOpen(false);
    router.push("/dashboard/profile");
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    router.push("/dashboard/settings");
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
        aria-label="User menu"
        type="button"
      >
        <div className="relative">
          <UserCircle className="h-9 w-9 text-white drop-shadow hover:text-white/80 transition-colors" />
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
        </div>
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 dark:divide-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-xl ring-1 ring-black/10 dark:ring-white/10 z-[60] overflow-hidden transition-all duration-200 ease-out transform opacity-100 scale-100">
          {/* User Info Section */}
          <div className="px-4 py-3">
            <div className="ml-3 max-w-[180px]">
              <p className="text-sm font-medium !text-gray-900 dark:!text-white break-all">
                {session?.user?.firstName && session?.user?.lastName
                  ? `${session.user.firstName} ${session.user.lastName}`
                  : userProfile?.firstName && userProfile?.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : "User"}
              </p>
              <p className="text-xs !text-gray-500 dark:!text-gray-400 break-all">
                {session?.user?.email
                  ? session.user.email
                  : userProfile?.email
                    ? userProfile.email
                    : ""}
              </p>
              {isAdmin && (
                <div className="mt-2 space-y-1">
                  {/* Balance Display */}
                  <BalanceDisplay
                    balance={userProfile?.balance}
                    loading={balanceLoading}
                  />

                  {/* Plan Display Component */}
                  <PlanDisplay isAdmin={isAdmin} />
                </div>
              )}
            </div>
          </div>
          {/* Menu Items */}
          <div className="py-1 ml-4">
            <button
              onClick={handleProfile}
              className="flex w-full items-center px-4 py-2.5 text-sm !text-gray-700 dark:!text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out"
            >
              <User className="h-4 w-4 mr-3 text-purple-500 dark:text-purple-400" />
              Profile
            </button>
            <button
              onClick={handleSettings}
              className="flex w-full items-center px-4 py-2.5 text-sm !text-gray-700 dark:!text-gray-200 hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out"
            >
              <Settings className="h-4 w-4 mr-3 text-blue-500 dark:text-blue-400" />
              Settings
            </button>
          </div>
          <div className="py-1 ml-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-2.5 text-sm !text-red-600 dark:!text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 ease-in-out"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// src/components/dashboardComponents/UserDropdownMenu.tsx
"use client";
import React from "react";
import { UserCircle, LogOut, User, Settings, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { BalanceDisplay } from "./BalanceDisplay";
import { PlanDisplay } from "./PlanDisplay";

export interface UserDropdownMenuProps {
  session: {
    user?: {
      firstName?: string;
      email?: string;
      lastName?: string;
      role?: string;
      isSuperAdmin?: boolean;
    };
  } | null;
  userProfile:
    | {
        firstName?: string;
        lastName?: string;
        email?: string;
        balance?: number;
        role?: string;
        isSuperAdmin?: boolean;
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

  const isSuperAdmin =
    isAdmin &&
    (session?.user?.isSuperAdmin === true ||
      userProfile?.isSuperAdmin === true);

  const handleProfile = () => {
    setDropdownOpen(false);
    router.push("/dashboard/profile");
  };

  const handleSettings = () => {
    setDropdownOpen(false);
    router.push("/dashboard/settings");
  };

  const handleAdminManagement = () => {
    setDropdownOpen(false);
    router.push("/dashboard/admin-management");
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOutWithoutInterstitial("/", router, { intentional: true });
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
          <UserCircle className="text-white transition-colors h-9 w-9 drop-shadow hover:text-white/80" />
          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />
        </div>
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 z-60 mt-2 w-[min(100vw-1.5rem,16rem)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md bg-white opacity-100 shadow-xl ring-1 ring-black/10 transition-all duration-200 ease-out divide-y divide-gray-100 origin-top-right transform scale-100 dark:divide-gray-700 dark:bg-gray-800 dark:ring-white/10 sm:w-60">
          {/* User Info Section */}
          <div className="px-4 py-3">
            <div className="ml-3 min-w-0 max-w-full pr-1 sm:max-w-[13.5rem]">
              <p className="text-sm font-medium text-gray-900! dark:text-white! break-all">
                {session?.user?.firstName && session?.user?.lastName
                  ? `${session.user.firstName} ${session.user.lastName}`
                  : userProfile?.firstName && userProfile?.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : "User"}
              </p>
              <p className="text-xs text-gray-500! dark:text-gray-400! break-all">
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
              className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out"
            >
              <User className="w-4 h-4 mr-3 text-purple-500 dark:text-purple-400" />
              Profile
            </button>
            <button
              onClick={handleSettings}
              className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out"
            >
              <Settings className="w-4 h-4 mr-3 text-blue-500 dark:text-blue-400" />
              Settings
            </button>
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={handleAdminManagement}
                className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700! dark:text-gray-200! hover:bg-purple-50 dark:hover:bg-gray-700/80 transition-colors duration-150 ease-in-out"
              >
                <Shield className="w-4 h-4 mr-3 text-amber-600 dark:text-amber-400" />
                Admin management
              </button>
            ) : null}
          </div>
          <div className="py-1 ml-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center px-4 py-2.5 text-sm text-red-600! dark:text-red-400! hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150 ease-in-out"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
